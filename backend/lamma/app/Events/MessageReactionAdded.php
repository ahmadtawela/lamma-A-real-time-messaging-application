<?php

namespace App\Events;

class MessageReactionAdded extends UserBroadcast
{
    public function broadcastAs(): string
    {
        return 'MessageReactionAdded';
    }
}
