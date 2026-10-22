<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StatusView extends Model
{
    public $timestamps = false;
    public $incrementing = false;
    protected $primaryKey = null;
    protected $fillable = ['status_id', 'user_id', 'viewed_at'];

    protected function casts(): array
    {
        return ['viewed_at' => 'datetime'];
    }
}
