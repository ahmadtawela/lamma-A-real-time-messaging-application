<?php

namespace App\Services\Sms;

use Illuminate\Support\Facades\Log;

/** Development driver: the "SMS" is written to storage/logs/laravel.log. */
class LogSmsSender implements SmsSender
{
    public function send(string $to, string $message): void
    {
        Log::info("[SMS to {$to}] {$message}");
    }
}
