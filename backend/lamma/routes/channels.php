<?php

use App\Models\User;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\DB;

/*
| Channel authorisation (POST /broadcasting/auth, protected by auth:sanctum).
| The React client subscribes to: private-user.{id}, private-conversation.{id}, presence-conversation.{id}.
| Echo strips the private-/presence- prefix, so ONE definition covers private and presence for conversations.
*/
Broadcast::channel('user.{id}', fn (User $user, int $id) => $user->id === $id);

Broadcast::channel('conversation.{id}', function (User $user, int $id) {
    $member = DB::table('conversation_user')->where('conversation_id', $id)->where('user_id', $user->id)->exists();

    // The returned array is the presence member info (ignored for the private variant).
    return $member ? ['id' => $user->id, 'name' => $user->name] : false;
});
