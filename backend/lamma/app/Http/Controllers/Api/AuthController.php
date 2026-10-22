<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\ActivityLog;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Auth\Events\Registered;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\DB;

class AuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        abort_unless(Setting::get('registration_open'), 403, __('Registration is closed.'));

        $data = $request->validate([
            'name' => ['required', 'string', 'max:80'],
            'email' => ['required', 'string', 'email:rfc', 'max:255', 'unique:users,email'],
            'password' => ['required', 'confirmed', PasswordRule::min(8)],
            'locale' => ['nullable', 'in:ar,en'],
            'terms' => ['accepted'],
        ]);

        $user = User::create([
            'name' => $data['name'],
            'email' => strtolower($data['email']),
            'username' => $this->uniqueUsername($data['email']),
            'password' => $data['password'],            // hashed by the model cast
            'locale' => $data['locale'] ?? 'en',
        ]);

        event(new Registered($user));                   // sends the verification email
        Auth::login($user);
        if ($request->hasSession()) {
            $request->session()->regenerate();
        }
        ActivityLog::record('User registered', 'info', $user->id);

        return response()->json(['user' => (new UserResource($user))->resolve($request)], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $data = $request->validate(['email' => ['required', 'string', 'email'], 'password' => ['required', 'string'], 'remember' => ['sometimes', 'boolean']]);

        $user = User::where('email', strtolower($data['email']))->first();
        // Always run a hash check (also for unknown emails) so response time doesn't reveal which emails exist.
        $valid = Hash::check($data['password'], $user->password ?? '$2y$12$usesomesillystringforsaltuYbVfGZ8p2KJ1mqYAL5DZnM6l7bW');
        if (! $user || ! $valid || $user->isBlocked()) {
            throw ValidationException::withMessages(['email' => [trans('auth.failed')]]);
        }

        if ($user->hasTwoFactor()) {
            if ($request->hasSession()) {
                $request->session()->put('two_factor', ['id' => $user->id, 'remember' => (bool) ($data['remember'] ?? false), 'at' => now()->timestamp]);
            }
            return response()->json(['two_factor' => true]);
        }

        return $this->completeLogin($request, $user, (bool) ($data['remember'] ?? false));
    }

    /** Second step: TOTP code or a one-time recovery code (account recovery). */
    public function twoFactorChallenge(Request $request, \App\Services\TwoFactor $tf): JsonResponse
    {
        $data = $request->validate(['code' => ['required', 'string', 'max:64'], 'recovery' => ['sometimes', 'boolean']]);
        $pending = $request->hasSession() ? $request->session()->get('two_factor') : null;
        if (! $pending || now()->timestamp - $pending['at'] > 600) {
            if ($request->hasSession()) {
                $request->session()->forget('two_factor');
            }
            throw ValidationException::withMessages(['code' => [__('The login session expired. Log in again.')]]);
        }
        $user = User::findOrFail($pending['id']);

        $ok = false;
        if (! empty($data['recovery'])) {
            $codes = $user->two_factor_recovery_codes ?? [];
            foreach ($codes as $i => $hash) {
                if (Hash::check(strtolower(trim($data['code'])), $hash)) {
                    unset($codes[$i]);                                  // single use
                    $user->forceFill(['two_factor_recovery_codes' => array_values($codes)])->save();
                    $ok = true;
                    break;
                }
            }
        } else {
            $ok = $tf->verify($user->two_factor_secret, $data['code']);
        }
        if (! $ok) {
            throw ValidationException::withMessages(['code' => [__('The provided code was invalid.')]]);
        }
        if ($request->hasSession()) {
            $request->session()->forget('two_factor');
        }

        return $this->completeLogin($request, $user, $pending['remember']);
    }

    public function logout(Request $request): JsonResponse
    {
        Auth::guard('web')->logout();
        if ($request->hasSession()) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return response()->json(null, 204);
    }

    public function me(Request $request): UserResource
    {
        return new UserResource($request->user());
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate(['email' => ['required', 'email']]);
        Password::sendResetLink($request->only('email'));

        // Same answer whether or not the email exists (no account enumeration).
        return response()->json(['message' => 'If that email exists, a reset link has been sent.']);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $data = $request->validate(['token' => ['required', 'string'], 'email' => ['required', 'email'], 'password' => ['required', 'confirmed', PasswordRule::min(8)]]);

        $status = Password::reset($data, function (User $user, string $password) {
            $user->forceFill(['password' => $password, 'remember_token' => Str::random(60)])->save();
            DB::table('sessions')->where('user_id', $user->id)->delete();   // sign out everywhere
            event(new PasswordReset($user));
        });
        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages(['email' => [trans($status)]]);
        }

        return response()->json(['message' => 'Your password has been reset.']);
    }

    /** Signed link from the verification email: GET /api/email/verify/{id}/{hash}. Redirects back to the React app. */
    public function verifyEmail(Request $request, int $id, string $hash)
    {
        $user = User::findOrFail($id);
        abort_unless(hash_equals(sha1($user->getEmailForVerification()), $hash), 403);
        if (! $user->hasVerifiedEmail() && $user->markEmailAsVerified()) {
            event(new Verified($user));
        }

        return redirect(rtrim(config('lamma.frontend_url'), '/').'/app');
    }

    public function resendVerification(Request $request): JsonResponse
    {
        if (! $request->user()->hasVerifiedEmail()) {
            $request->user()->sendEmailVerificationNotification();
        }

        return response()->json(['message' => 'Verification link sent.'], 202);
    }

    private function completeLogin(Request $request, User $user, bool $remember): JsonResponse
    {
        Auth::login($user, $remember);
        if ($request->hasSession()) {
            $request->session()->regenerate();         // prevents session fixation
        }

        return response()->json(['user' => (new UserResource($user))->resolve($request)]);
    }

    private function uniqueUsername(string $email): string
    {
        $base = Str::of(Str::before($email, '@'))->lower()->replaceMatches('/[^a-z0-9_.]/', '')->limit(24, '')->toString() ?: 'user';
        $name = $base;
        while (User::where('username', $name)->exists()) {
            $name = $base.random_int(100, 99999);
        }

        return $name;
    }
}
