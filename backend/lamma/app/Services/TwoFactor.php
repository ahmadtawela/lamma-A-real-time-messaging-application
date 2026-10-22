<?php

namespace App\Services;

use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/** Minimal RFC 6238 TOTP (SHA-1, 6 digits, 30 s) so no extra package is required. Compatible with Google Authenticator & friends. */
class TwoFactor
{
    private const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

    public function generateSecret(int $bytes = 20): string
    {
        $raw = random_bytes($bytes);
        $bits = '';
        foreach (str_split($raw) as $c) {
            $bits .= str_pad(decbin(ord($c)), 8, '0', STR_PAD_LEFT);
        }
        $out = '';
        foreach (str_split($bits, 5) as $chunk) {
            $out .= self::ALPHABET[bindec(str_pad($chunk, 5, '0'))];
        }
        return $out;
    }

    public function otpauthUrl(string $secret, string $account, string $issuer = 'Lamma'): string
    {
        return 'otpauth://totp/'.rawurlencode("$issuer:$account").'?secret='.$secret.'&issuer='.rawurlencode($issuer).'&digits=6&period=30';
    }

    public function code(string $secret, ?int $timestamp = null): string
    {
        $counter = intdiv($timestamp ?? time(), 30);
        $hash = hash_hmac('sha1', pack('J', $counter), $this->base32Decode($secret), true);
        $offset = ord($hash[19]) & 0xF;
        $value = ((ord($hash[$offset]) & 0x7F) << 24) | ((ord($hash[$offset + 1]) & 0xFF) << 16) | ((ord($hash[$offset + 2]) & 0xFF) << 8) | (ord($hash[$offset + 3]) & 0xFF);
        return str_pad((string) ($value % 1_000_000), 6, '0', STR_PAD_LEFT);
    }

    /** Accepts the previous/current/next 30 s window to tolerate clock drift. */
    public function verify(string $secret, string $code, int $window = 1): bool
    {
        $code = preg_replace('/\s+/', '', $code);
        if (! preg_match('/^\d{6}$/', $code)) {
            return false;
        }
        for ($i = -$window; $i <= $window; $i++) {
            if (hash_equals($this->code($secret, time() + $i * 30), $code)) {
                return true;
            }
        }
        return false;
    }

    /** @return array{0: string[], 1: string[]} [plain codes to show once, hashed codes to store] */
    public function recoveryCodes(int $count = 8): array
    {
        $plain = [];
        for ($i = 0; $i < $count; $i++) {
            $plain[] = Str::lower(Str::random(5).'-'.Str::random(5));
        }
        return [$plain, array_map(fn ($c) => Hash::make($c), $plain)];
    }

    private function base32Decode(string $secret): string
    {
        $bits = '';
        foreach (str_split(strtoupper($secret)) as $c) {
            $pos = strpos(self::ALPHABET, $c);
            if ($pos !== false) {
                $bits .= str_pad(decbin($pos), 5, '0', STR_PAD_LEFT);
            }
        }
        $out = '';
        foreach (str_split($bits, 8) as $byte) {
            if (strlen($byte) === 8) {
                $out .= chr(bindec($byte));
            }
        }
        return $out;
    }
}
