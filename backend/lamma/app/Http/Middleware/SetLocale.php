<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Server messages (validation, mails) follow the user's locale, or Accept-Language for guests. Supported: ar, en. */
class SetLocale
{
    public function handle(Request $request, Closure $next): Response
    {
        $locale = $request->user()?->locale ?? substr((string) $request->header('Accept-Language', 'en'), 0, 2);
        app()->setLocale(in_array($locale, ['ar', 'en'], true) ? $locale : 'en');
        return $next($request);
    }
}
