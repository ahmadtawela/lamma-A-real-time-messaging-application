<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CallResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $me = $request->user();

        return [
            'id' => $this->id,
            'direction' => $this->caller_id === $me->id ? 'outgoing' : 'incoming',
            'peer_id' => $this->caller_id === $me->id ? $this->callee_id : $this->caller_id,
            'kind' => $this->kind,
            'status' => $this->status,
            'duration' => $this->duration,
            'created_at' => $this->created_at,
        ];
    }
}
