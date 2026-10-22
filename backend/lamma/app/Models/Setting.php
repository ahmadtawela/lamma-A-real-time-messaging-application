<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class Setting extends Model
{
    public $timestamps = false;
    public $incrementing = false;
    protected $primaryKey = 'key';
    protected $keyType = 'string';
    protected $fillable = ['key', 'value'];

    protected function casts(): array
    {
        return ['value' => 'json'];
    }

    public const DEFAULTS = ['registration_open' => true, 'require_email_verification' => true, 'max_upload_mb' => 20, 'maintenance_mode' => false];

    public static function get(string $key): mixed
    {
        return Cache::remember("setting.$key", 300, fn () => static::find($key)?->value ?? (self::DEFAULTS[$key] ?? null));
    }

    public static function put(string $key, mixed $value): void
    {
        static::updateOrCreate(['key' => $key], ['value' => $value]);
        Cache::forget("setting.$key");
    }

    public static function all_(): array
    {
        $out = [];
        foreach (array_keys(self::DEFAULTS) as $k) {
            $out[$k] = static::get($k);
        }
        return $out;
    }
}
