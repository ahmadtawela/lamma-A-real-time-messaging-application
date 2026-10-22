<?php

namespace App\Events;

class MessageEdited extends UserBroadcast
{
    public function broadcastAs(): string
    {
        return 'MessageEdited';
    }
}
