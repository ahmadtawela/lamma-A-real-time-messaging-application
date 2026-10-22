<?php

namespace App\Events;

class MessageRead extends UserBroadcast
{
    public function broadcastAs(): string
    {
        return 'MessageRead';
    }
}
