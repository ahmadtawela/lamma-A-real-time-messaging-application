<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Support\Sql;
use Illuminate\Http\Request;

class UserController extends Controller
{
    /** GET /api/users?q= — searches name/username only (never email, to avoid harvesting addresses). */
    public function index(Request $request)
    {
        $request->validate(['q' => ['nullable', 'string', 'max:60']]);
        $me = $request->user();
        $q = trim((string) $request->query('q', ''));

        $users = User::query()
            ->where('id', '!=', $me->id)->whereNull('blocked_at')->whereNotNull('email_verified_at')
            ->when($q !== '', fn ($b) => $b->where(fn ($w) => $w->where('name', 'like', Sql::like($q))->orWhere('username', 'like', Sql::like($q))))
            ->orderBy('name')->limit(30)->get();

        return UserResource::collection($users);
    }
}
