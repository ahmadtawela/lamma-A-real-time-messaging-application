<?php

namespace App\Events;

class UserLeftGroup extends UserBroadcast
{
    public function broadcastAs(): string
    {
        return 'UserLeftGroup';
    }
}
