<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\User */
class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $viewer = $request->user();
        $self = $viewer && $viewer->id === $this->id;
        $privileged = $self || $viewer?->is_admin;
        $hideSeen = ! $self && ! $viewer?->is_admin && $this->setting('last_seen_visibility', 'everyone') === 'nobody';

        return [
            'id' => $this->id,
            'name' => $this->name,
            'username' => $this->username,
            'avatar_url' => $this->avatarUrl(),
            'about' => $this->about,
            'is_online' => $hideSeen ? false : $this->isOnline(),
            'last_seen_at' => $hideSeen ? null : $this->last_seen_at?->toIso8601String(),
            'is_blocked' => $viewer ? in_array($this->id, $viewer->blockedIds(), true) : false,
            // Private data only for the owner (or an admin).
            $this->mergeWhen($privileged, [
                'email' => $this->email,
                'phone' => $this->phone,
                'email_verified_at' => $this->email_verified_at?->toIso8601String(),
            ]),
            $this->mergeWhen($self, [
                'locale' => $this->locale,
                'is_admin' => (bool) $this->is_admin,
                'two_factor' => $this->hasTwoFactor(),
                'settings' => $this->settings ?? (object) [],
            ]),
            $this->mergeWhen((bool) $viewer?->is_admin && ! $self, ['blocked_at' => $this->blocked_at?->toIso8601String(), 'is_admin' => (bool) $this->is_admin]),
        ];
    }
}
