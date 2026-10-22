<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\DB;

class Message extends Model
{
    use SoftDeletes;

    public const TYPES = ['text', 'image', 'video', 'audio', 'voice', 'file', 'location', 'contact', 'poll', 'sticker', 'gif', 'system'];

    protected $fillable = ['conversation_id', 'sender_id', 'client_id', 'type', 'body', 'meta', 'reply_to_id'];

    protected function casts(): array
    {
        return ['meta' => 'array', 'delivered_at' => 'datetime', 'read_at' => 'datetime', 'pinned_at' => 'datetime', 'edited_at' => 'datetime'];
    }

    public function conversation(): BelongsTo { return $this->belongsTo(Conversation::class); }
    public function sender(): BelongsTo { return $this->belongsTo(User::class, 'sender_id'); }
    public function replyTo(): BelongsTo { return $this->belongsTo(self::class, 'reply_to_id'); }
    public function attachments(): HasMany { return $this->hasMany(Attachment::class); }
    public function reactions(): HasMany { return $this->hasMany(Reaction::class); }
    public function receipts(): HasMany { return $this->hasMany(MessageReceipt::class); }
    public function pollOptions(): HasMany { return $this->hasMany(PollOption::class); }

    /** Messages in conversations the user participates in (outsiders get a 404 instead of a 403 => no existence leak). */
    public function scopeVisibleTo(Builder $query, User $user): Builder
    {
        return $query->whereIn('conversation_id', DB::table('conversation_user')->where('user_id', $user->id)->select('conversation_id'));
    }
}
