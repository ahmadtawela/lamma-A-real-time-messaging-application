<?php

namespace App\Events;

class MessageSent extends UserBroadcast
{
    public function broadcastAs(): string
    {
        return 'MessageSent';
    }
}
