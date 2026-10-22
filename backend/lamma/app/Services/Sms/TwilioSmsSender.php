<?php

namespace App\Services\Sms;

use Illuminate\Support\Facades\Http;
use RuntimeException;

/** Twilio REST API (no SDK needed). Configure SMS_DRIVER=twilio, TWILIO_SID, TWILIO_TOKEN, TWILIO_FROM. Swap for Vonage/Unifonic/etc. by implementing SmsSender. */
class TwilioSmsSender implements SmsSender
{
    public function send(string $to, string $message): void
    {
        $c = config('sms.twilio');
        $res = Http::asForm()->withBasicAuth($c['sid'], $c['token'])->timeout(10)
            ->post("https://api.twilio.com/2010-04-01/Accounts/{$c['sid']}/Messages.json", ['To' => $to, 'From' => $c['from'], 'Body' => $message]);
        if ($res->failed()) {
            throw new RuntimeException('SMS gateway error ('.$res->status().')');
        }
    }
}
