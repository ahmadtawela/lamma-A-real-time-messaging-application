<?php

namespace App\Http\Controllers\Api;

use App\Events\MessageSent;
use App\Events\UserJoinedGroup;
use App\Events\UserLeftGroup;
use App\Http\Controllers\Controller;
use App\Http\Resources\ConversationResource;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use App\Services\ConversationService;
use App\Services\NotifyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class GroupController extends Controller
{
    public function __construct(private ConversationService $service, private NotifyService $notify) {}

    public function index(Request $request)
    {
        $me = $request->user();
        $groups = $me->conversations()->where('conversations.type', 'group')->with(['users', 'latestMessage'])->get();
        $counts = $this->service->unreadCounts($me, $groups->pluck('id'));
        $groups->each(fn ($g) => $g->setAttribute('unread_count', $counts[$g->id] ?? 0));

        return ConversationResource::collection($groups);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'], 'description' => ['nullable', 'string', 'max:255'],
            'user_ids' => ['nullable', 'array', 'max:255'], 'user_ids.*' => ['integer', 'exists:users,id'],
        ]);
        $me = $request->user();
        $group = $this->service->createGroup($me, $data, $data['user_ids'] ?? []);

        foreach ($group->users()->where('users.id', '!=', $me->id)->get() as $member) {
            $this->notify->to($member, 'group_invitation', "{$me->name}: {$group->name}");
        }

        return response()->json(['data' => (new ConversationResource($this->load($me, $group->id)))->resolve($request)], 201);
    }

    public function show(Request $request, int $id): ConversationResource
    {
        return new ConversationResource($this->load($request->user(), $id));
    }

    public function update(Request $request, int $id): ConversationResource
    {
        $me = $request->user();
        $group = $this->group($me, $id);
        $this->authorize('manage', $group);
        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:100'], 'description' => ['sometimes', 'nullable', 'string', 'max:255'],
            'restrict_messaging' => ['sometimes', 'boolean'],
        ]);
        $group->update($data);

        return new ConversationResource($this->load($me, $id));
    }

    public function avatar(Request $request, int $id): ConversationResource
    {
        $me = $request->user();
        $group = $this->group($me, $id);
        $this->authorize('manage', $group);
        $request->validate(['avatar' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120']]);
        $path = $request->file('avatar')->store("groups/{$group->id}", 'public');
        if ($group->avatar_path) {
            Storage::disk('public')->delete($group->avatar_path);
        }
        $group->update(['avatar_path' => $path]);

        return new ConversationResource($this->load($me, $id));
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $group = $this->group($request->user(), $id);
        $this->authorize('manage', $group);
        $group->delete();                      // cascades members, messages, attachments rows

        return response()->json(null, 204);
    }

    public function addMembers(Request $request, int $id): ConversationResource
    {
        $me = $request->user();
        $group = $this->group($me, $id);
        $this->authorize('manage', $group);
        $data = $request->validate(['user_ids' => ['required', 'array', 'min:1', 'max:100'], 'user_ids.*' => ['integer', 'exists:users,id']]);

        $existing = $this->service->participantIds($group);
        $new = User::whereIn('id', array_diff($data['user_ids'], $existing))->whereNull('blocked_at')->get();
        foreach ($new as $user) {
            $group->users()->attach($user->id, ['role' => 'member', 'joined_at' => now(), 'last_read_message_id' => (int) $group->messages()->max('id')]);
            $this->system($group, $user, 'joined');
            $this->notify->to($user, 'group_invitation', "{$me->name}: {$group->name}");
            broadcast(new UserJoinedGroup($this->service->participantIds($group), ['conversation_id' => $group->id, 'user_id' => $user->id]))->toOthers();
        }

        return new ConversationResource($this->load($me, $id));
    }

    /** DELETE /api/groups/{id}/members/{userId} — admins remove others; anyone can remove themselves (leave). */
    public function removeMember(Request $request, int $id, int $userId): ConversationResource|JsonResponse
    {
        $me = $request->user();
        $group = $this->group($me, $id);
        if ($userId !== $me->id) {
            $this->authorize('manage', $group);
        }
        abort_unless($group->users()->where('users.id', $userId)->exists(), 404);

        $leaving = User::findOrFail($userId);
        $recipients = $this->service->participantIds($group);
        $group->users()->detach($userId);
        $this->system($group, $leaving, 'left');
        broadcast(new UserLeftGroup($recipients, ['conversation_id' => $group->id, 'user_id' => $userId]))->toOthers();

        $remaining = $group->users()->get();
        if ($remaining->isEmpty()) {
            $group->delete();
        } elseif (! $remaining->contains(fn ($u) => $u->pivot->role === 'admin')) {
            $group->users()->updateExistingPivot($remaining->first()->id, ['role' => 'admin']);   // never leave a group without an admin
        }

        return $userId === $me->id ? response()->json(null, 204) : new ConversationResource($this->load($me, $id));
    }

    public function setAdmin(Request $request, int $id): ConversationResource
    {
        $me = $request->user();
        $group = $this->group($me, $id);
        $this->authorize('manage', $group);
        $data = $request->validate(['user_id' => ['required', 'integer']]);
        abort_unless($group->users()->where('users.id', $data['user_id'])->exists(), 404);
        $group->users()->updateExistingPivot($data['user_id'], ['role' => 'admin']);

        return new ConversationResource($this->load($me, $id));
    }

    public function removeAdmin(Request $request, int $id, int $userId): ConversationResource
    {
        $me = $request->user();
        $group = $this->group($me, $id);
        $this->authorize('manage', $group);
        abort_if($group->users()->wherePivot('role', 'admin')->count() <= 1, 422, __('A group needs at least one admin.'));
        $group->users()->updateExistingPivot($userId, ['role' => 'member']);

        return new ConversationResource($this->load($me, $id));
    }

    /** POST /api/groups/join/{code} — join through the invite link. */
    public function join(Request $request, string $code): ConversationResource
    {
        $me = $request->user();
        $group = Conversation::where('type', 'group')->where('invite_code', $code)->firstOrFail();
        if (! $group->users()->where('users.id', $me->id)->exists()) {
            $group->users()->attach($me->id, ['role' => 'member', 'joined_at' => now(), 'last_read_message_id' => (int) $group->messages()->max('id')]);
            $this->system($group, $me, 'joined');
        }

        return new ConversationResource($this->load($me, $group->id));
    }

    private function group(User $me, int $id): Conversation
    {
        return $me->conversations()->where('conversations.type', 'group')->where('conversations.id', $id)->firstOrFail();   // 404 for non-members
    }

    private function load(User $me, int $id): Conversation
    {
        $g = $me->conversations()->with(['users', 'latestMessage.attachments', 'latestMessage.reactions', 'latestMessage.pollOptions.votes'])->where('conversations.id', $id)->firstOrFail();
        $g->setAttribute('unread_count', $this->service->unreadCounts($me, [$g->id])[$g->id] ?? 0);

        return $g;
    }

    private function system(Conversation $group, User $about, string $key): void
    {
        $m = Message::create(['conversation_id' => $group->id, 'sender_id' => $about->id, 'type' => 'system', 'body' => $key]);
        $group->forceFill(['last_message_at' => now()])->save();
        broadcast(new MessageSent($this->service->participantIds($group), ['message' => (new \App\Http\Resources\MessageResource($m))->resolve(request())]))->toOthers();
    }
}
