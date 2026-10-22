<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Status */
class StatusResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $me = $request->user()->id;
        $owner = $this->user_id === $me;

        return [
            'id' => $this->id, 'user_id' => $this->user_id, 'kind' => $this->kind, 'text' => $this->text, 'color' => $this->color,
            'media_url' => $this->mediaUrl(), 'privacy' => $this->privacy,
            'created_at' => $this->created_at?->toIso8601String(), 'expires_at' => $this->expires_at?->toIso8601String(),
            'seen' => $owner || $this->views->contains('user_id', $me),
            // Only the owner can see who viewed / reacted.
            'viewers' => $owner ? $this->views->map(fn ($v) => ['user_id' => $v->user_id, 'at' => $v->viewed_at?->toIso8601String()])->values()->all() : [],
            'reactions' => $owner ? $this->reactions->map(fn ($r) => ['user_id' => $r->user_id, 'emoji' => $r->emoji])->values()->all() : [],
        ];
    }
}
