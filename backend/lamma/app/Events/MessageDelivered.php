<?php

namespace App\Events;

class MessageDelivered extends UserBroadcast
{
    public function broadcastAs(): string
    {
        return 'MessageDelivered';
    }
}
