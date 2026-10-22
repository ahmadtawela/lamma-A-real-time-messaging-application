<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Eager-load: attachments, reactions, pollOptions.votes (see MessageController::with()).
 * Deleted messages are returned as tombstones (no body / attachments / meta) so the UI can show "This message was deleted".
 *
 * @mixin \App\Models\Message
 */
class MessageResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $deleted = $this->deleted_at !== null;

        return [
            'id' => $this->id,
            'client_id' => $this->client_id,
            'conversation_id' => $this->conversation_id,
            'sender_id' => $this->sender_id,
            'type' => $this->type,
            'body' => $deleted ? null : $this->body,
            'meta' => $deleted ? null : $this->metaPayload(),
            'reply_to_id' => $this->reply_to_id,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->edited_at?->toIso8601String(),
            'delivered_at' => $this->delivered_at?->toIso8601String(),
            'read_at' => $this->read_at?->toIso8601String(),
            'deleted_at' => $this->deleted_at?->toIso8601String(),
            'pinned_at' => $this->pinned_at?->toIso8601String(),
            'attachments' => $deleted ? [] : AttachmentResource::collection($this->whenLoaded('attachments'))->resolve($request),
            'reactions' => $deleted ? [] : $this->whenLoaded('reactions', fn () => $this->reactions->groupBy('emoji')->map(fn ($g, $emoji) => ['emoji' => $emoji, 'user_ids' => $g->pluck('user_id')->values()->all()])->values()->all(), []),
        ];
    }

    private function metaPayload(): ?array
    {
        if ($this->type !== 'poll') {
            return $this->meta;
        }
        $options = $this->relationLoaded('pollOptions')
            ? $this->pollOptions->map(fn ($o) => ['id' => $o->id, 'text' => $o->text, 'votes' => $o->relationLoaded('votes') ? $o->votes->pluck('user_id')->values()->all() : []])->all()
            : [];
        return ['question' => $this->meta['question'] ?? '', 'options' => $options];
    }
}
