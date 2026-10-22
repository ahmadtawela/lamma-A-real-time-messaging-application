<?php

namespace App\Policies;

use App\Models\Message;
use App\Models\User;

class MessagePolicy
{
    public function update(User $user, Message $m): bool
    {
        return $m->sender_id === $user->id && in_array($m->type, ['text'], true) && $m->deleted_at === null;
    }

    public function delete(User $user, Message $m): bool
    {
        return $m->sender_id === $user->id;
    }
}
