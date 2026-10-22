<?php

namespace App\Events;

class MessageDeleted extends UserBroadcast
{
    public function broadcastAs(): string
    {
        return 'MessageDeleted';
    }
}
