<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ActivityLog extends Model
{
    protected $fillable = ['level', 'message', 'user_id', 'context'];

    protected function casts(): array
    {
        return ['context' => 'array'];
    }

    public static function record(string $message, string $level = 'info', ?int $userId = null, array $context = []): void
    {
        static::create(['level' => $level, 'message' => $message, 'user_id' => $userId, 'context' => $context ?: null]);
    }
}
