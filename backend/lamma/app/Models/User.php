<?php

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;

class User extends Authenticatable implements MustVerifyEmail
{
    use HasFactory, Notifiable;

    // is_admin / blocked_at are intentionally NOT fillable (no privilege escalation through mass assignment).
    protected $fillable = ['name', 'username', 'email', 'password', 'avatar_path', 'about', 'phone', 'locale', 'settings'];

    protected $hidden = ['password', 'remember_token', 'two_factor_secret', 'two_factor_recovery_codes'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_admin' => 'boolean',
            'blocked_at' => 'datetime',
            'last_seen_at' => 'datetime',
            'settings' => 'array',
            'two_factor_secret' => 'encrypted',
            'two_factor_recovery_codes' => 'encrypted:array',
            'two_factor_confirmed_at' => 'datetime',
        ];
    }

    public function conversations(): BelongsToMany
    {
        return $this->belongsToMany(Conversation::class)
            ->withPivot(['role', 'is_pinned', 'is_muted', 'is_archived', 'marked_unread', 'draft', 'last_read_message_id', 'cleared_message_id', 'hidden_at', 'joined_at']);
    }

    public function contacts(): HasMany
    {
        return $this->hasMany(Contact::class);
    }

    public function hasTwoFactor(): bool
    {
        return $this->two_factor_confirmed_at !== null && $this->two_factor_secret !== null;
    }

    /** Presence is a short-lived cache flag refreshed by the TouchLastSeen middleware (and Reverb presence hooks if you add them). */
    public function isOnline(): bool
    {
        return Cache::has("online.{$this->id}");
    }

    public function avatarUrl(): ?string
    {
        return $this->avatar_path ? asset('storage/' . ltrim($this->avatar_path, '/')) : null;
    }

    public function setting(string $key, mixed $default = null): mixed
    {
        return data_get($this->settings ?? [], $key, $default);
    }

    private ?array $blockedIdsCache = null;

    /** Ids of the users THIS user has blocked (memoised per request). */
    public function blockedIds(): array
    {
        return $this->blockedIdsCache ??= Contact::where('user_id', $this->id)->whereNotNull('blocked_at')->pluck('contact_id')->all();
    }

    /** Ids of users who blocked THIS user. */
    public function blockedByIds(): array
    {
        return Contact::where('contact_id', $this->id)->whereNotNull('blocked_at')->pluck('user_id')->all();
    }

    public function isBlocked(): bool
    {
        return $this->blocked_at !== null;
    }
}
