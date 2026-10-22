<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MessageReceipt extends Model
{
    public $timestamps = false;

    protected $fillable = ['message_id', 'user_id', 'delivered_at', 'read_at'];

    protected function casts(): array
    {
        return ['delivered_at' => 'datetime', 'read_at' => 'datetime'];
    }
}
