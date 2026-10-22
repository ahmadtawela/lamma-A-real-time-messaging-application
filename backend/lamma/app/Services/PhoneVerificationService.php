<?php

namespace App\Services;

use App\Models\User;
use App\Services\Sms\SmsSender;
use App\Support\PhoneNumber;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;

/**
 * SMS one-time-code verification.
 *  - code: 6 digits, valid 10 min, max 5 wrong attempts (then a new code is required), stored only as an HMAC (never in clear).
 *  - abuse limits: 60 s cooldown between sends and 5 sends/hour/user (SMS-pumping protection), plus the route throttle.
 *  - a number can belong to ONE account; the response for "taken" is generic and never reveals whose it is.
 */
class PhoneVerificationService
{
    public function __construct(private SmsSender $sms) {}

    /** @return array{expires_in:int,resend_in:int} */
    public function request(User $user, string $input): array
    {
        $cfg = config('sms.otp');
        $phone = PhoneNumber::normalize($input) ?? throw ValidationException::withMessages(['phone' => [__('The phone number is not valid.')]]);

        $taken = User::where('phone', $phone)->whereNotNull('phone_verified_at')->where('id', '!=', $user->id)->exists();
        if ($taken) {
            throw ValidationException::withMessages(['phone' => [__('This number cannot be used.')]]);
        }

        if (! Cache::add("phone.cooldown.{$user->id}", 1, $cfg['cooldown'])) {
            abort(429, __('Please wait before requesting another code.'), ['Retry-After' => $cfg['cooldown']]);
        }
        $key = "phone.sends.{$user->id}";
        if (RateLimiter::tooManyAttempts($key, $cfg['max_per_hour'])) {
            abort(429, __('Too Many Attempts.'), ['Retry-After' => RateLimiter::availableIn($key)]);
        }
        RateLimiter::hit($key, 3600);

        $code = str_pad((string) random_int(0, 10 ** $cfg['length'] - 1), $cfg['length'], '0', STR_PAD_LEFT);
        Cache::put("phone.otp.{$user->id}", ['phone' => $phone, 'hash' => $this->hash($code), 'attempts' => 0], $cfg['ttl']);
        $this->sms->send($phone, __('Your Lamma verification code is :code. It expires in :minutes minutes.', ['code' => $code, 'minutes' => intdiv($cfg['ttl'], 60)]));

        return ['expires_in' => $cfg['ttl'], 'resend_in' => $cfg['cooldown']];
    }

    public function verify(User $user, string $code): User
    {
        $cfg = config('sms.otp');
        $entry = Cache::get("phone.otp.{$user->id}");
        if (! $entry) {
            throw ValidationException::withMessages(['code' => [__('The code has expired. Request a new one.')]]);
        }
        if ($entry['attempts'] >= $cfg['max_attempts']) {
            Cache::forget("phone.otp.{$user->id}");
            throw ValidationException::withMessages(['code' => [__('Too many wrong attempts. Request a new code.')]]);
        }
        if (! hash_equals($entry['hash'], $this->hash(trim($code)))) {
            $entry['attempts']++;
            Cache::put("phone.otp.{$user->id}", $entry, $cfg['ttl']);
            throw ValidationException::withMessages(['code' => [__('The provided code was invalid.')]]);
        }

        return DB::transaction(function () use ($user, $entry) {
            if (User::where('phone', $entry['phone'])->whereNotNull('phone_verified_at')->where('id', '!=', $user->id)->lockForUpdate()->exists()) {
                throw ValidationException::withMessages(['phone' => [__('This number cannot be used.')]]);
            }
            $user->forceFill(['phone' => $entry['phone'], 'phone_verified_at' => now()])->save();
            Cache::forget("phone.otp.{$user->id}");

            return $user->refresh();
        });
    }

    public function remove(User $user): User
    {
        $user->forceFill(['phone' => null, 'phone_verified_at' => null])->save();

        return $user->refresh();
    }

    private function hash(string $code): string
    {
        return hash_hmac('sha256', $code, (string) config('app.key'));
    }
}
