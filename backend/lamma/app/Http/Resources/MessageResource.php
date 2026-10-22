<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MessageResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'conversation_id' => $this->conversation_id,
            'sender_id' => $this->sender_id,
            'type' => $this->type,
            'body' => $this->body,
            'meta' => $this->meta,
            'reply_to_id' => $this->reply_to_id,
            'pinned_at' => $this->pinned_at,
            'edited_at' => $this->edited_at,
            'deleted_at' => $this->deleted_at,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'attachments' => AttachmentResource::collection($this->whenLoaded('attachments')),
            'reactions' => $this->whenLoaded('reactions', fn() => $this->reactions->groupBy('emoji')->map(fn($group) => [
                'emoji' => $group->first()->emoji,
                'user_ids' => $group->pluck('user_id')->values()->all(),
            ])->values()->all()),
            'pollOptions' => $this->whenLoaded('pollOptions'),
        ];
    }
}
