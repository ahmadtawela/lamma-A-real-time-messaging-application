<?php

namespace App\Events;

class CallIncoming extends UserBroadcast
{
    public function broadcastAs(): string
    {
        return 'CallIncoming';
    }
}
