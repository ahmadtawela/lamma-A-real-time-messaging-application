<?php

namespace App\Services;

use App\Models\User;
use App\Notifications\GenericNotification;

class NotifyService
{
    /** type: message|mention|group_invitation|missed_call|reaction|contact_request|system */
    public function to(User $user, string $type, string $body): void
    {
        $user->notify(new GenericNotification($type, $body));
    }
}
