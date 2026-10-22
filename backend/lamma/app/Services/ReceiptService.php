<?php

namespace App\Services;

use App\Events\MessageDelivered;
use App\Events\MessageRead;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\MessageReceipt;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Per-recipient receipts + denormalised aggregates on messages (delivered_at / read_at are set when ALL other participants
 * have delivered / read, which is what the sender's ✓ / ✓✓ / blue ✓✓ shows).
 */
class ReceiptService
{
    /** @param  Collection<int,Message>  $messages */
    public function markDelivered(User $user, Collection $messages): void
    {
        $pending = $messages->filter(fn (Message $m) => $m->sender_id !== $user->id && $m->type !== 'system' && $m->delivered_at === null);
        foreach ($pending as $m) {
            MessageReceipt::updateOrCreate(['message_id' => $m->id, 'user_id' => $user->id], ['delivered_at' => now()]);
            $this->refreshAggregate($m, 'delivered_at');
            $fresh = $m->fresh();
            if ($fresh?->delivered_at) {
                event(new MessageDelivered([$m->sender_id], ['conversation_id' => $m->conversation_id, 'message_id' => $m->id, 'delivered_at' => $fresh->delivered_at->toIso8601String()]));
            }
        }
    }

    /** Marks everything up to $upToId (or the latest message) as read for $user. */
    public function markRead(User $user, Conversation $conversation, ?int $upToId = null): void
    {
        $upToId ??= (int) $conversation->messages()->max('id');
        DB::table('conversation_user')->where('conversation_id', $conversation->id)->where('user_id', $user->id)
            ->where(fn ($q) => $q->whereNull('last_read_message_id')->orWhere('last_read_message_id', '<', $upToId))
            ->update(['last_read_message_id' => $upToId, 'marked_unread' => false]);
        DB::table('conversation_user')->where('conversation_id', $conversation->id)->where('user_id', $user->id)->update(['marked_unread' => false]);

        if ($user->setting('read_receipts', true) === false) {
            return; // user opted out of sending read receipts
        }

        $messages = $conversation->messages()->where('id', '<=', $upToId)->where('sender_id', '!=', $user->id)->where('type', '!=', 'system')->whereNull('read_at')->get();
        foreach ($messages as $m) {
            MessageReceipt::updateOrCreate(['message_id' => $m->id, 'user_id' => $user->id], ['read_at' => now(), 'delivered_at' => now()]);
            $this->refreshAggregate($m, 'delivered_at');
            $this->refreshAggregate($m, 'read_at');
            if ($m->fresh()->read_at) {
                event(new MessageRead([$m->sender_id], ['conversation_id' => $conversation->id, 'message_id' => $m->id, 'read_at' => $m->fresh()->read_at?->toIso8601String(), 'user_id' => $user->id]));
            }
        }
    }

    private function refreshAggregate(Message $m, string $column): void
    {
        $needed = DB::table('conversation_user')->where('conversation_id', $m->conversation_id)->where('user_id', '!=', $m->sender_id)->count();
        $done = MessageReceipt::where('message_id', $m->id)->whereNotNull($column)->count();
        if ($needed > 0 && $done >= $needed) {
            Message::whereKey($m->id)->whereNull($column)->update([$column => now()]);
        }
    }
}
