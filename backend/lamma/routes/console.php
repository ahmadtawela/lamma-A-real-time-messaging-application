<?php

use App\Models\Status;
use Illuminate\Support\Facades\Schedule;
use Illuminate\Support\Facades\Storage;

// Remove expired statuses (and their media) every hour. Needs `php artisan schedule:work` (dev) or the cron entry (prod).
Schedule::call(function () {
    Status::where('expires_at', '<', now())->get()->each(function (Status $s) {
        if ($s->media_path) {
            Storage::disk('public')->delete($s->media_path);
        }
        $s->delete();
    });
})->hourly()->name('statuses:prune')->onOneServer();

// Drop attachments that were uploaded but never sent in a message (older than a day).
Schedule::call(function () {
    \App\Models\Attachment::whereNull('message_id')->where('created_at', '<', now()->subDay())->get()->each(function ($a) {
        Storage::disk($a->disk)->delete($a->path);
        $a->delete();
    });
})->daily()->name('attachments:prune')->onOneServer();

// Ringing calls nobody answered within a minute become "missed" (both sides are told over the websocket).
Schedule::call(fn () => app(\App\Services\CallService::class)->expireRinging())->everyMinute()->name('calls:expire')->onOneServer();
