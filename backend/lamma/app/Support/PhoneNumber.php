<?php

namespace App\Support;

/**
 * Phone numbers are stored and compared in E.164 ("+" + country code + number, max 15 digits).
 * The React app validates with libphonenumber and sends E.164; this class is the server-side gate
 * (it also tolerates spaces, dashes, parentheses and a "00" international prefix).
 * For per-country validity rules install giggsey/libphonenumber-for-php and call it from normalize().
 */
class PhoneNumber
{
    public static function normalize(?string $input): ?string
    {
        if ($input === null) {
            return null;
        }
        $s = trim($input);
        // Arabic-Indic / Persian digits → ASCII
        $s = strtr($s, ['٠' => '0', '١' => '1', '٢' => '2', '٣' => '3', '٤' => '4', '٥' => '5', '٦' => '6', '٧' => '7', '٨' => '8', '٩' => '9',
            '۰' => '0', '۱' => '1', '۲' => '2', '۳' => '3', '۴' => '4', '۵' => '5', '۶' => '6', '۷' => '7', '۸' => '8', '۹' => '9']);
        $s = preg_replace('/[\s().\-]/u', '', $s);
        if (str_starts_with($s, '00')) {
            $s = '+'.substr($s, 2);
        }

        return preg_match('/^\+[1-9]\d{7,14}$/', $s) ? $s : null;
    }
}
