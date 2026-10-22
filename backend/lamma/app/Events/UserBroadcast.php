<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;

/**
 * Base for every realtime event. Each event is delivered on the private channel of every recipient
 * (private-user.{id}); the React client already listens there and also on the active conversation channel.
 * broadcastAs() must equal the names in the front-end src/realtime/events.js.
 */
abstract class UserBroadcast implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets;

    /** @param int[] $recipientIds  @param array<string,mixed> $payload */
    public function __construct(public array $recipientIds, public array $payload) {}

    abstract public function broadcastAs(): string;

    /** @return Channel[] */
    public function broadcastOn(): array
    {
        return array_map(fn ($id) => new PrivateChannel('user.'.$id), array_values(array_unique($this->recipientIds)));
    }

    public function broadcastWith(): array
    {
        return $this->payload;
    }
}
