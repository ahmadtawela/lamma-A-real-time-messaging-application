<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Built from $user->conversations() so ->pivot holds THIS user's flags. Controllers set the dynamic attribute
 * `unread_count` (ConversationService::unreadCounts) and eager-load users:id + latestMessage.
 *
 * @mixin \App\Models\Conversation
 */
class ConversationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $pivot = $this->pivot;
        $group = $this->isGroup();
        $unread = (int) ($this->getAttribute('unread_count') ?? 0);
        if ($pivot?->marked_unread && $unread === 0) {
            $unread = 1;
        }
        $last = $this->relationLoaded('latestMessage') ? $this->latestMessage : null;

        return [
            'id' => $this->id,
            'type' => $this->type,
            'name' => $group ? $this->name : null,
            'description' => $group ? $this->description : null,
            'avatar_url' => $group ? $this->avatarUrl() : null,
            'participants' => $this->whenLoaded('users', fn () => $this->users->map(fn ($user) => $user->toArray())->values()->all(), []),
            'participant_ids' => $this->whenLoaded('users', fn () => $this->users->pluck('id')->values()->all(), []),
            'admin_ids' => $group ? $this->whenLoaded('users', fn () => $this->users->filter(fn ($u) => $u->pivot->role === 'admin')->pluck('id')->values()->all(), []) : [],
            'restrict_messaging' => $group ? (bool) $this->restrict_messaging : false,
            'invite_link' => $group && $this->invite_code ? rtrim(config('lamma.frontend_url'), '/').'/join/'.$this->invite_code : null,
            'last_message' => $last ? (new MessageResource($last))->resolve($request) : null,
            'unread_count' => $unread,
            'is_pinned' => (bool) $pivot?->is_pinned,
            'is_muted' => (bool) $pivot?->is_muted,
            'is_archived' => (bool) $pivot?->is_archived,
            'draft' => $pivot?->draft,
            'updated_at' => ($this->last_message_at ?? $this->updated_at)?->toIso8601String(),
        ];
    }
}
