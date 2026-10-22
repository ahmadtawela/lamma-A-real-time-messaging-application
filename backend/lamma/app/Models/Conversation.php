<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Facades\Storage;

class Conversation extends Model
{
    /** Columns loaded for participants embedded in conversation payloads (public profile fields only). */
    public const PARTICIPANTS = 'users:id,name,username,avatar_path,about,last_seen_at,settings';

    protected $fillable = ['type', 'name', 'description', 'avatar_path', 'invite_code', 'restrict_messaging', 'private_key', 'created_by', 'last_message_at'];

    protected function casts(): array
    {
        return ['restrict_messaging' => 'boolean', 'last_message_at' => 'datetime'];
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class)->withPivot(['role', 'is_pinned', 'is_muted', 'is_archived', 'marked_unread', 'draft', 'last_read_message_id', 'cleared_message_id', 'hidden_at', 'joined_at']);
    }

    public function messages(): HasMany
    {
        return $this->hasMany(Message::class);
    }

    public function latestMessage(): HasOne
    {
        return $this->hasOne(Message::class)->latestOfMany();
    }

    public function isGroup(): bool
    {
        return $this->type === 'group';
    }

    public static function privateKey(int $a, int $b): string
    {
        return min($a, $b).':'.max($a, $b);
    }

    public function avatarUrl(): ?string
    {
        if (! $this->avatar_path) {
            return null;
        }

        /** @var \Illuminate\Filesystem\FilesystemAdapter $disk */
        $disk = Storage::disk('public');

        return $disk->url($this->avatar_path);
    }

    public function isAdmin(User $user): bool
    {
        return $this->users()->where('users.id', $user->id)->wherePivot('role', 'admin')->exists();
    }
}
