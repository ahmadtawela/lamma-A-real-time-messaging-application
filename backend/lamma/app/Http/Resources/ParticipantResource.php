<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** Public profile of a conversation member (no e-mail / phone). Lets the client show names, avatars, presence and call buttons without a global user directory. @mixin \App\Models\User */
class ParticipantResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $viewer = $request->user();
        $hideSeen = $viewer?->id !== $this->id && $this->setting('last_seen_visibility', 'everyone') === 'nobody';

        return [
            'id' => $this->id, 'name' => $this->name, 'username' => $this->username, 'avatar_url' => $this->avatarUrl(), 'about' => $this->about,
            'is_online' => $hideSeen ? false : $this->isOnline(), 'last_seen_at' => $hideSeen ? null : $this->last_seen_at?->toIso8601String(),
            'is_blocked' => $viewer ? in_array($this->id, $viewer->blockedIds(), true) : false,
        ];
    }
}
