<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Attachment */
class AttachmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id, 'name' => $this->name, 'mime' => $this->mime, 'size' => $this->size, 'url' => $this->url(),
            'duration' => $this->duration, 'waveform' => $this->waveform,
        ];
    }
}
