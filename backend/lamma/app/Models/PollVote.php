<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PollVote extends Model
{
    public $timestamps = false;

    protected $fillable = ['poll_option_id', 'message_id', 'user_id'];
}
