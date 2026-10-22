<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Call */
class CallResource extends JsonResource
{
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
