<?php

namespace App\Events;

class CallIceCandidate extends UserBroadcast
{
    public function broadcastAs(): string
    {
        return 'CallIce';
    }
}
