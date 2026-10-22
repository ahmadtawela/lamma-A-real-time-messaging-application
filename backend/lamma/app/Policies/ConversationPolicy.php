<?php

namespace App\Policies;

use App\Models\Conversation;
use App\Models\User;

/** Conversations are always resolved through the user's own relation (404 for outsiders); the policy handles ROLES. */
class ConversationPolicy
{
    public function manage(User $user, Conversation $c): bool
    {
        return $c->isGroup() && $c->isAdmin($user);
    }

    public function post(User $user, Conversation $c): bool
    {
        if ($c->isGroup()) {
            return ! $c->restrict_messaging || $c->isAdmin($user);
        }
        $other = $c->users()->where('users.id', '!=', $user->id)->value('users.id');
        return $other === null || (! in_array($other, $user->blockedIds(), true) && ! in_array($other, $user->blockedByIds(), true));
    }
}
