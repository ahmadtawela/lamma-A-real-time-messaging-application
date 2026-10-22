<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Services\PhoneVerificationService;
use App\Services\TwoFactor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Illuminate\Validation\ValidationException;

class ProfileController extends Controller
{
    public function update(Request $request): UserResource
    {
        $user = $request->user();
        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:80'],
            'username' => ['sometimes', 'required', 'string', 'min:3', 'max:40', 'regex:/^[a-z0-9_.]+$/', Rule::unique('users', 'username')->ignore($user->id)],
            'about' => ['sometimes', 'nullable', 'string', 'max:140'],
        ]);
        $user->update($data);

        return new UserResource($user->refresh());
    }

    /** PUT /api/user/preferences { locale?, settings? } — the language switcher calls this. */
    public function preferences(Request $request): UserResource
    {
        $data = $request->validate([
            'locale' => ['sometimes', 'in:ar,en'],
            'settings' => ['sometimes', 'array'],
            'settings.last_seen_visibility' => ['sometimes', 'in:everyone,contacts,nobody'],
            'settings.profile_photo_visibility' => ['sometimes', 'in:everyone,contacts,nobody'],
            'settings.about_visibility' => ['sometimes', 'in:everyone,contacts,nobody'],
            'settings.read_receipts' => ['sometimes', 'boolean'],
            'settings.phone_discoverable' => ['sometimes', 'boolean'],
        ]);
        $user = $request->user();
        if (isset($data['locale'])) {
            $user->locale = $data['locale'];
        }
        if (isset($data['settings'])) {
            $user->settings = array_replace($user->settings ?? [], $data['settings']);
        }
        $user->save();

        return new UserResource($user);
    }

    public function avatar(Request $request): UserResource
    {
        $request->validate(['avatar' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120', 'dimensions:max_width=4000,max_height=4000']]);
        $user = $request->user();
        $path = $request->file('avatar')->store("avatars/{$user->id}", 'public');
        if ($user->avatar_path) {
            Storage::disk('public')->delete($user->avatar_path);
        }
        $user->update(['avatar_path' => $path]);

        return new UserResource($user);
    }

    // ---- Phone verification (Settings > Profile) -----------------------------------------------------------

    /** POST /api/user/phone { phone: "+905551112233" } → sends an SMS code. */
    public function requestPhone(Request $request, PhoneVerificationService $phones): JsonResponse
    {
        $data = $request->validate(['phone' => ['required', 'string', 'max:32']]);

        return response()->json(['data' => $phones->request($request->user(), $data['phone'])]);
    }

    public function verifyPhone(Request $request, PhoneVerificationService $phones): JsonResponse
    {
        $data = $request->validate(['code' => ['required', 'string', 'max:10']]);

        return response()->json(['data' => (new UserResource($phones->verify($request->user(), $data['code'])))->resolve($request)]);
    }

    public function removePhone(Request $request, PhoneVerificationService $phones): JsonResponse
    {
        return response()->json(['data' => (new UserResource($phones->remove($request->user())))->resolve($request)]);
    }

    public function changePassword(Request $request): JsonResponse
    {
        $request->validate(['current_password' => ['required', 'current_password'], 'password' => ['required', 'confirmed', PasswordRule::min(8), 'different:current_password']]);
        $request->user()->update(['password' => $request->input('password')]);

        return response()->json(null, 204);
    }

    // ---- Two-factor setup (Settings > Security) -------------------------------------------------------------

    public function twoFactorSetup(Request $request, TwoFactor $tf): JsonResponse
    {
        $user = $request->user();
        abort_if($user->hasTwoFactor(), 409, __('Two-factor authentication is already enabled.'));
        $secret = $tf->generateSecret();
        $user->forceFill(['two_factor_secret' => $secret, 'two_factor_confirmed_at' => null])->save();

        return response()->json(['secret' => $secret, 'otpauth_url' => $tf->otpauthUrl($secret, $user->email)]);
    }

    public function twoFactorConfirm(Request $request, TwoFactor $tf): JsonResponse
    {
        $request->validate(['code' => ['required', 'string']]);
        $user = $request->user();
        if (! $user->two_factor_secret || ! $tf->verify($user->two_factor_secret, $request->input('code'))) {
            throw ValidationException::withMessages(['code' => [__('The provided code was invalid.')]]);
        }
        [$plain, $hashed] = $tf->recoveryCodes();
        $user->forceFill(['two_factor_confirmed_at' => now(), 'two_factor_recovery_codes' => $hashed])->save();

        return response()->json(['recovery_codes' => $plain]);   // shown once
    }

    public function twoFactorDisable(Request $request): JsonResponse
    {
        $request->validate(['password' => ['required', 'current_password']]);
        $request->user()->forceFill(['two_factor_secret' => null, 'two_factor_recovery_codes' => null, 'two_factor_confirmed_at' => null])->save();

        return response()->json(null, 204);
    }

    public function destroy(Request $request): JsonResponse
    {
        $request->validate(['password' => ['required', 'current_password']]);
        $user = $request->user();
        abort_if($user->is_admin && \App\Models\User::where('is_admin', true)->count() === 1, 403, __('The last admin cannot be deleted.'));
        auth()->guard('web')->logout();
        $request->session()->invalidate();
        $user->delete();

        return response()->json(null, 204);
    }
}
