<?php

namespace App\Http\Controllers\Api;

use App\Events\MessageDeleted;
use App\Events\MessageEdited;
use App\Events\MessageReactionAdded;
use App\Events\MessageSent;
use App\Http\Controllers\Controller;
use App\Http\Resources\MessageResource;
use App\Models\Attachment;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\PollVote;
use App\Models\Reaction;
use App\Models\User;
use App\Services\ConversationService;
use App\Services\NotifyService;
use App\Services\ReceiptService;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class MessageController extends Controller
{
    public function __construct(private ConversationService $conversations, private ReceiptService $receipts, private NotifyService $notify) {}

    public const WITH = ['attachments', 'reactions', 'pollOptions.votes'];

    /** GET /api/conversations/{id}/messages?before=&limit= — cursor pagination, oldest-first inside the page. */
    public function index(Request $request, int $conversationId): JsonResponse
    {
        $me = $request->user();
        $data = $request->validate(['before' => ['nullable', 'integer', 'min:1'], 'limit' => ['nullable', 'integer', 'min:1', 'max:50']]);
        $conversation = $me->conversations()->where('conversations.id', $conversationId)->firstOrFail();
        $limit = (int) ($data['limit'] ?? config('lamma.messages_page_size'));
        $cleared = (int) $conversation->pivot->cleared_message_id;

        $rows = Message::withTrashed()->with(self::WITH)
            ->where('conversation_id', $conversation->id)->where('id', '>', $cleared)
            ->when(isset($data['before']), fn ($q) => $q->where('id', '<', $data['before']))
            ->orderByDesc('id')->limit($limit + 1)->get();

        $hasMore = $rows->count() > $limit;
        $page = $rows->take($limit)->reverse()->values();
        $this->receipts->markDelivered($me, $page);             // fetching = delivered

        return response()->json([
            'data' => MessageResource::collection($page)->resolve($request),
            'meta' => ['has_more' => $hasMore, 'next_cursor' => $page->first()?->id],
        ]);
    }

    /** POST /api/messages — idempotent through client_id (safe to retry after a network failure). */
    public function store(Request $request): JsonResponse
    {
        $me = $request->user();
        $data = $request->validate([
            'conversation_id' => ['required', 'integer'],
            'client_id' => ['nullable', 'string', 'max:64'],
            'type' => ['nullable', Rule::in(array_diff(Message::TYPES, ['system']))],
            'body' => ['nullable', 'string', 'max:4000'],
            'reply_to_id' => ['nullable', 'integer'],
            'attachments' => ['nullable', 'array', 'max:10'],
            'attachments.*.id' => ['required_with:attachments', 'integer'],
            'attachments.*.duration' => ['nullable', 'integer', 'min:0', 'max:7200'],
            'attachments.*.waveform' => ['nullable', 'array', 'max:64'],
            'attachments.*.waveform.*' => ['integer', 'min:0', 'max:100'],
            'meta' => ['nullable', 'array'],
            'meta.forwarded' => ['sometimes', 'boolean'],
            'meta.lat' => ['sometimes', 'numeric', 'between:-90,90'], 'meta.lng' => ['sometimes', 'numeric', 'between:-180,180'], 'meta.label' => ['sometimes', 'nullable', 'string', 'max:120'],
            'meta.name' => ['sometimes', 'string', 'max:80'], 'meta.phone' => ['sometimes', 'nullable', 'string', 'max:32'],
            'meta.question' => ['sometimes', 'string', 'max:200'], 'meta.options' => ['sometimes', 'array', 'min:2', 'max:10'], 'meta.options.*.text' => ['required_with:meta.options', 'string', 'max:100'],
        ]);
        $type = $data['type'] ?? 'text';

        $conversation = $me->conversations()->where('conversations.id', $data['conversation_id'])->firstOrFail();   // 404 for outsiders
        $this->authorize('post', $conversation);                                                                    // 403: restricted group / blocked

        // Idempotency: same client_id from the same sender returns the original message.
        if (! empty($data['client_id']) && ($dup = Message::where('sender_id', $me->id)->where('client_id', $data['client_id'])->with(self::WITH)->first())) {
            return response()->json(['data' => (new MessageResource($dup))->resolve($request)], 200);
        }

        $this->validateShape($type, $data);
        if (! empty($data['reply_to_id'])) {
            abort_unless(Message::where('conversation_id', $conversation->id)->whereKey($data['reply_to_id'])->exists(), 422, __('The message you are replying to does not exist in this conversation.'));
        }

        try {
            $message = DB::transaction(function () use ($data, $type, $me, $conversation) {
                $meta = $this->cleanMeta($type, $data['meta'] ?? []);
                $message = Message::create([
                    'conversation_id' => $conversation->id, 'sender_id' => $me->id, 'client_id' => $data['client_id'] ?? null,
                    'type' => $type, 'body' => isset($data['body']) ? trim($data['body']) : null, 'meta' => $meta ?: null, 'reply_to_id' => $data['reply_to_id'] ?? null,
                ]);

                foreach ($data['attachments'] ?? [] as $a) {
                    // Only the uploader's own, still-unattached files can be attached (prevents hijacking someone else's upload).
                    $att = Attachment::where('user_id', $me->id)->whereNull('message_id')->findOrFail($a['id']);
                    $att->update(['message_id' => $message->id, 'duration' => $a['duration'] ?? $att->duration, 'waveform' => $a['waveform'] ?? $att->waveform]);
                }
                if ($type === 'poll') {
                    foreach ($data['meta']['options'] as $o) {
                        $message->pollOptions()->create(['text' => trim($o['text'])]);
                    }
                }

                $conversation->forceFill(['last_message_at' => now()])->save();
                // A new message brings a hidden private chat back for every participant and counts as read for the sender.
                DB::table('conversation_user')->where('conversation_id', $conversation->id)->update(['hidden_at' => null]);
                DB::table('conversation_user')->where('conversation_id', $conversation->id)->where('user_id', $me->id)->update(['last_read_message_id' => $message->id, 'marked_unread' => false]);

                return $message;
            });
        } catch (QueryException $e) {      // lost a race on (sender_id, client_id)
            $existing = Message::where('sender_id', $me->id)->where('client_id', $data['client_id'] ?? '')->with(self::WITH)->first();
            if ($existing) {
                return response()->json(['data' => (new MessageResource($existing))->resolve($request)], 200);
            }
            throw $e;
        }

        $message->load(self::WITH);
        $resource = (new MessageResource($message))->resolve($request);
        broadcast(new MessageSent($this->conversations->participantIds($conversation), ['message' => $resource]))->toOthers();

        return response()->json(['data' => $resource], 201);
    }

    /** PUT /api/messages/{id}: { body } edits your own text message; { pinned: bool } pins/unpins for the conversation. */
    public function update(Request $request, int $id): JsonResponse
    {
        $message = $this->find($request->user(), $id);

        if ($request->has('pinned')) {
            $request->validate(['pinned' => ['boolean']]);
            $message->forceFill(['pinned_at' => $request->boolean('pinned') ? now() : null])->save();
        } else {
            $this->authorize('update', $message);
            $data = $request->validate(['body' => ['required', 'string', 'max:4000']]);
            $message->forceFill(['body' => trim($data['body']), 'edited_at' => now()])->save();
        }

        return $this->respondAndBroadcast($request, $message, MessageEdited::class);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $message = $this->find($request->user(), $id);
        $this->authorize('delete', $message);

        DB::transaction(function () use ($message) {
            foreach ($message->attachments as $a) {
                Storage::disk($a->disk)->delete($a->path);
            }
            $message->attachments()->delete();
            $message->forceFill(['pinned_at' => null])->save();
            $message->delete();                                           // soft delete => tombstone for the UI
        });

        $message = Message::withTrashed()->with(self::WITH)->findOrFail($id);

        return $this->respondAndBroadcast($request, $message, MessageDeleted::class);
    }

    public function read(Request $request, int $id): JsonResponse
    {
        $me = $request->user();
        $message = $this->find($me, $id);
        $this->receipts->markRead($me, $message->conversation, $message->id);

        return response()->json(null, 204);
    }

    /** POST /api/messages/{id}/reaction { emoji } — toggles YOUR reaction. */
    public function react(Request $request, int $id): JsonResponse
    {
        $me = $request->user();
        $data = $request->validate(['emoji' => ['required', 'string', Rule::in(config('lamma.reactions'))]]);
        $message = $this->find($me, $id);
        abort_if($message->deleted_at !== null, 404);

        $existing = Reaction::where(['message_id' => $message->id, 'user_id' => $me->id, 'emoji' => $data['emoji']])->first();
        if ($existing) {
            $existing->delete();
        } else {
            Reaction::create(['message_id' => $message->id, 'user_id' => $me->id, 'emoji' => $data['emoji']]);
            if ($message->sender_id !== $me->id) {
                $this->notify->to(User::findOrFail($message->sender_id), 'reaction', "{$me->name} {$data['emoji']}");
            }
        }

        return $this->respondAndBroadcast($request, $message->refresh(), MessageReactionAdded::class);
    }

    /** POST /api/messages/{id}/vote { option_id } — single-choice poll; voting the same option again removes the vote. */
    public function vote(Request $request, int $id): JsonResponse
    {
        $me = $request->user();
        $data = $request->validate(['option_id' => ['required', 'integer']]);
        $message = $this->find($me, $id);
        abort_unless($message->type === 'poll', 404);
        $option = $message->pollOptions()->findOrFail($data['option_id']);

        $current = PollVote::where(['message_id' => $message->id, 'user_id' => $me->id])->first();
        $current?->delete();
        if (! $current || $current->poll_option_id !== $option->id) {
            PollVote::create(['poll_option_id' => $option->id, 'message_id' => $message->id, 'user_id' => $me->id]);
        }

        return $this->respondAndBroadcast($request, $message->refresh(), MessageEdited::class);
    }

    /** POST /api/messages/{id}/star — toggles the personal star. */
    public function star(Request $request, int $id): JsonResponse
    {
        $me = $request->user();
        $message = $this->find($me, $id);
        $changes = DB::table('message_stars')->where(['user_id' => $me->id, 'message_id' => $message->id])->delete();
        if (! $changes) {
            DB::table('message_stars')->insert(['user_id' => $me->id, 'message_id' => $message->id]);
        }

        return response()->json(['starred' => ! $changes]);
    }

    public function starred(Request $request): JsonResponse
    {
        $me = $request->user();
        $ids = DB::table('message_stars')->where('user_id', $me->id)->pluck('message_id');
        $messages = Message::visibleTo($me)->with(self::WITH)->whereIn('id', $ids)->orderByDesc('id')->limit(100)->get();

        return response()->json(['data' => MessageResource::collection($messages)->resolve($request)]);
    }

    // ----------------------------------------------------------------------------------------------------------

    private function find(User $me, int $id): Message
    {
        return Message::withTrashed()->visibleTo($me)->with(array_merge(self::WITH, ['conversation']))->findOrFail($id);   // 404 for outsiders
    }

    private function respondAndBroadcast(Request $request, Message $message, string $event): JsonResponse
    {
        $message->load(self::WITH);
        $resource = (new MessageResource($message))->resolve($request);
        broadcast(new $event($this->conversations->participantIds(Conversation::findOrFail($message->conversation_id)), ['message' => $resource]))->toOthers();

        return response()->json(['data' => $resource]);
    }

    private function validateShape(string $type, array $data): void
    {
        $errors = [];
        $hasAtt = ! empty($data['attachments']);
        if (in_array($type, ['text', 'sticker', 'gif'], true) && blank($data['body'] ?? null)) {
            $errors['body'] = [__('The body field is required.')];
        }
        if (in_array($type, ['image', 'video', 'audio', 'voice', 'file'], true) && ! $hasAtt) {
            $errors['attachments'] = [__('At least one attachment is required.')];
        }
        if ($type === 'location' && (! isset($data['meta']['lat']) || ! isset($data['meta']['lng']))) {
            $errors['meta'] = [__('Location needs lat and lng.')];
        }
        if ($type === 'contact' && blank($data['meta']['name'] ?? null)) {
            $errors['meta'] = [__('Contact needs a name.')];
        }
        if ($type === 'poll' && (blank($data['meta']['question'] ?? null) || count($data['meta']['options'] ?? []) < 2)) {
            $errors['meta'] = [__('A poll needs a question and at least 2 options.')];
        }
        if ($errors) {
            throw ValidationException::withMessages($errors);
        }
    }

    /** Whitelist what is persisted in messages.meta (poll options live in their own table). */
    private function cleanMeta(string $type, array $meta): array
    {
        $out = [];
        if (! empty($meta['forwarded'])) {
            $out['forwarded'] = true;
        }
        if ($type === 'location') {
            $out += ['lat' => (float) $meta['lat'], 'lng' => (float) $meta['lng'], 'label' => $meta['label'] ?? null];
        }
        if ($type === 'contact') {
            $out += ['name' => $meta['name'], 'phone' => $meta['phone'] ?? null];
        }
        if ($type === 'poll') {
            $out += ['question' => $meta['question']];
        }

        return $out;
    }
}
