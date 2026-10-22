<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StatusReaction extends Model
{
    public $timestamps = false;
    public $incrementing = false;
    protected $primaryKey = null;
    protected $fillable = ['status_id', 'user_id', 'emoji'];
}
