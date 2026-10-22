<?php

namespace App\Events;

class CallEnded extends UserBroadcast
{
    public function broadcastAs(): string
    {
        return 'CallEnded';
    }
}
