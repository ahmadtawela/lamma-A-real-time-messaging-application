<?php

// SMS gateway used for phone-verification codes. "log" writes the message to storage/logs/laravel.log (development).
return [
    'driver' => env('SMS_DRIVER', 'log'),         // log | twilio
    'twilio' => ['sid' => env('TWILIO_SID'), 'token' => env('TWILIO_TOKEN'), 'from' => env('TWILIO_FROM')],
    'otp' => ['ttl' => 600, 'length' => 6, 'max_attempts' => 5, 'cooldown' => 60, 'max_per_hour' => 5],
];
