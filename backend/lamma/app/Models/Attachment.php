<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class Attachment extends Model
{
    protected $fillable = ['user_id', 'message_id', 'disk', 'path', 'name', 'mime', 'size', 'duration', 'waveform'];

    protected function casts(): array
    {
        return ['waveform' => 'array', 'size' => 'integer', 'duration' => 'integer'];
    }

    public function getUrlAttribute(): string
    {
        /** @var \Illuminate\Filesystem\FilesystemAdapter $disk */
        $disk = Storage::disk($this->disk);

        return $disk->url($this->path);
    }
}
