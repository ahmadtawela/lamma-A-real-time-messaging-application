<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

/** Marks the user online for 2 minutes and persists last_seen_at at most once per minute (no write on every request). */
class TouchLastSeen
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);
        if ($user = $request->user()) {
            Cache::put("online.{$user->id}", true, now()->addMinutes(2));
            if (Cache::add("seen.{$user->id}", true, now()->addMinute())) {
                $user->forceFill(['last_seen_at' => now()])->saveQuietly();
            }
        }
        return $response;
    }
}
