<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ConversationResource;
use App\Models\Conversation;
use App\Models\User;
use App\Services\ConversationService;
use App\Services\ReceiptService;
use App\Support\FullText;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ConversationController extends Controller
{
    public function __construct(private ConversationService $service, private ReceiptService $receipts) {}

    private const WITH = ['users', 'latestMessage.attachments', 'latestMessage.reactions', 'latestMessage.pollOptions.votes'];

    public function index(Request $request)
    {
        $data = $request->validate(['filter' => ['nullable', 'in:all,unread,groups,contacts,archived'], 'q' => ['nullable', 'string', 'max:60']]);
        $me = $request->user();
        $filter = $data['filter'] ?? 'all';
        $q = trim($data['q'] ?? '');

        $query = $me->conversations()->with(self::WITH)->wherePivotNull('hidden_at')
            ->wherePivot('is_archived', $filter === 'archived')
            ->when($filter === 'groups', fn ($b) => $b->where('conversations.type', 'group'))
            ->when($filter === 'contacts', fn ($b) => $b->where('conversations.type', 'private'))
            ->when($q !== '', fn ($b) => $b->where(function ($w) use ($q, $me) {
                FullText::where($w, 'conversations.name', $q);
                $w->orWhereHas('users', fn ($u) => FullText::where($u->where('users.id', '!=', $me->id), 'users.name', $q))
                    ->orWhereHas('messages', fn ($m) => FullText::where($m, 'messages.body', $q));
            }))
            ->orderByDesc('conversation_user.is_pinned')->orderByDesc('conversations.last_message_at');

        $items = $query->limit(200)->get();
        $counts = $this->service->unreadCounts($me, $items->pluck('id'));
        $items->each(fn ($c) => $c->setAttribute('unread_count', $counts[$c->id] ?? 0));
        if ($filter === 'unread') {
            $items = $items->filter(fn ($c) => $c->unread_count > 0 || $c->pivot->marked_unread)->values();
        }

        return ConversationResource::collection($items)->additional(['meta' => ['total' => $items->count()]]);
    }

    public function show(Request $request, int $id): ConversationResource
    {
        return new ConversationResource($this->find($request->user(), $id));
    }

    /** POST /api/conversations { user_id } — start (or reopen) a private conversation. */
    public function store(Request $request): ConversationResource
    {
        $data = $request->validate(['user_id' => ['required', 'integer', 'exists:users,id']]);
        $me = $request->user();
        $other = User::whereNull('blocked_at')->findOrFail($data['user_id']);
        abort_if($other->id === $me->id, 422, __('You cannot start a conversation with yourself.'));
        abort_if(in_array($other->id, $me->blockedByIds(), true) || in_array($other->id, $me->blockedIds(), true), 403, __('You cannot message this user.'));

        $conversation = $this->service->startPrivate($me, $other);

        return new ConversationResource($this->find($me, $conversation->id));
    }

    /** PUT /api/conversations/{id} { is_pinned?, is_muted?, is_archived?, draft?, unread_count? } */
    public function update(Request $request, int $id): ConversationResource
    {
        $me = $request->user();
        $conversation = $this->find($me, $id);
        $data = $request->validate([
            'is_pinned' => ['sometimes', 'boolean'], 'is_muted' => ['sometimes', 'boolean'], 'is_archived' => ['sometimes', 'boolean'],
            'draft' => ['sometimes', 'nullable', 'string', 'max:2000'], 'unread_count' => ['sometimes', 'integer', 'min:0'],
        ]);

        if (array_key_exists('unread_count', $data)) {
            if ($data['unread_count'] === 0) {
                $this->receipts->markRead($me, $conversation);
            } else {
                $data['marked_unread'] = true;      // "mark as unread" keeps a dot even with no unread messages
            }
            unset($data['unread_count']);
        }
        if ($data) {
            $conversation->users()->updateExistingPivot($me->id, $data);
        }

        return new ConversationResource($this->find($me, $id));
    }

    /** DELETE — hides a private conversation and clears its history for THIS user only. Groups: leave instead. */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $me = $request->user();
        $conversation = $this->find($me, $id);
        abort_if($conversation->isGroup(), 422, __('Leave the group instead.'));
        $conversation->users()->updateExistingPivot($me->id, ['hidden_at' => now(), 'cleared_message_id' => (int) $conversation->messages()->withTrashed()->max('id')]);

        return response()->json(null, 204);
    }

    /** DELETE /api/conversations/{id}/messages — clear chat for THIS user (other participants keep their history). */
    public function clear(Request $request, int $id): JsonResponse
    {
        $me = $request->user();
        $conversation = $this->find($me, $id);
        $conversation->users()->updateExistingPivot($me->id, ['cleared_message_id' => (int) $conversation->messages()->withTrashed()->max('id')]);

        return response()->json(null, 204);
    }

    public function read(Request $request, int $id): ConversationResource
    {
        $me = $request->user();
        $this->receipts->markRead($me, $this->find($me, $id));

        return new ConversationResource($this->find($me, $id));
    }

    private function find(User $me, int $id): Conversation
    {
        // Resolved through the user's own relation => outsiders get 404 (no existence leak, no IDOR).
        $c = $me->conversations()->with(self::WITH)->where('conversations.id', $id)->firstOrFail();
        $c->setAttribute('unread_count', $this->service->unreadCounts($me, [$c->id])[$c->id] ?? 0);

        return $c;
    }
}
