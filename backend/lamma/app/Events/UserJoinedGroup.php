<?php

namespace App\Events;

class UserJoinedGroup extends UserBroadcast
{
    public function broadcastAs(): string
    {
        return 'UserJoinedGroup';
    }
}
