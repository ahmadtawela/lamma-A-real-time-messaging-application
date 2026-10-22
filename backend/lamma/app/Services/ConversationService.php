<?php

namespace App\Services;

use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ConversationService
{
    /** One private conversation per pair of users (enforced by the unique private_key). */
    public function startPrivate(User $a, User $b): Conversation
    {
        $key = Conversation::privateKey($a->id, $b->id);

        return DB::transaction(function () use ($a, $b, $key) {
            $c = Conversation::firstOrCreate(['private_key' => $key], ['type' => 'private', 'created_by' => $a->id]);
            if ($c->wasRecentlyCreated) {
                $c->users()->attach([$a->id => ['joined_at' => now()], $b->id => ['joined_at' => now()]]);
            } else {
                $c->users()->updateExistingPivot([$a->id], ['hidden_at' => null, 'is_archived' => false]);
            }
            return $c;
        });
    }

    public function createGroup(User $owner, array $data, array $memberIds): Conversation
    {
        return DB::transaction(function () use ($owner, $data, $memberIds) {
            $c = Conversation::create([
                'type' => 'group', 'name' => $data['name'], 'description' => $data['description'] ?? null,
                'invite_code' => Str::lower(Str::random(16)), 'created_by' => $owner->id,
            ]);
            $c->users()->attach($owner->id, ['role' => 'admin', 'joined_at' => now()]);
            $members = User::whereIn('id', array_diff(array_unique($memberIds), [$owner->id]))->whereNull('blocked_at')->pluck('id');
            foreach ($members as $id) {
                $c->users()->attach($id, ['role' => 'member', 'joined_at' => now()]);
            }
            Message::create(['conversation_id' => $c->id, 'sender_id' => $owner->id, 'type' => 'system', 'body' => 'group_created']);
            $c->update(['last_message_at' => now()]);
            return $c;
        });
    }

    /** @param  \Illuminate\Support\Collection<int,int>|array<int,int>  $conversationIds  @return array<int,int> conversation_id => unread */
    public function unreadCounts(User $user, $conversationIds): array
    {
        return Message::query()
            ->join('conversation_user as cu', function ($j) use ($user) {
                $j->on('cu.conversation_id', '=', 'messages.conversation_id')->where('cu.user_id', $user->id);
            })
            ->whereIn('messages.conversation_id', $conversationIds)
            ->where('messages.sender_id', '!=', $user->id)
            ->where('messages.type', '!=', 'system')
            ->whereNull('messages.deleted_at')
            ->whereRaw('messages.id > COALESCE(cu.last_read_message_id, 0)')
            ->whereRaw('messages.id > COALESCE(cu.cleared_message_id, 0)')
            ->groupBy('messages.conversation_id')
            ->selectRaw('messages.conversation_id as cid, COUNT(*) as n')
            ->pluck('n', 'cid')->map(fn ($n) => (int) $n)->all();
    }

    /** @return int[] */
    public function participantIds(Conversation $c): array
    {
        return DB::table('conversation_user')->where('conversation_id', $c->id)->pluck('user_id')->map(fn ($i) => (int) $i)->all();
    }
}
