<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Contact extends Model
{
    protected $fillable = ['user_id', 'contact_id', 'blocked_at'];

    protected function casts(): array
    {
        return ['blocked_at' => 'datetime'];
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(User::class, 'contact_id');
    }
}
