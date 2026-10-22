<?php

namespace App\Http\Controllers;

use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

// Laravel 11+ ships an empty base controller; this one adds $this->authorize() for the policies.
abstract class Controller
{
    use AuthorizesRequests;
}
