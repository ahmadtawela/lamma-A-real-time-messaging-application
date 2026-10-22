<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

class Status extends Model
{
    protected $fillable = ['user_id', 'kind', 'text', 'color', 'media_path', 'privacy', 'expires_at'];

    protected function casts(): array
    {
        return ['expires_at' => 'datetime'];
    }

    public function user(): BelongsTo { return $this->belongsTo(User::class); }
    public function views(): HasMany { return $this->hasMany(StatusView::class); }
    public function reactions(): HasMany { return $this->hasMany(StatusReaction::class); }

    public function mediaUrl(): ?string
    {
        return $this->media_path ? Storage::url($this->media_path) : null;
    }
}
