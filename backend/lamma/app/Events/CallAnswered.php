<?php

namespace App\Events;

class CallAnswered extends UserBroadcast
{
    public function broadcastAs(): string
    {
        return 'CallAnswered';
    }
}
