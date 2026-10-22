<?php

use App\Http\Middleware\EnsureUserIsAdmin;
use App\Http\Middleware\SetLocale;
use App\Http\Middleware\TouchLastSeen;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        // Sanctum SPA mode: cookie session + CSRF for the React front-end on a stateful domain.
        $middleware->statefulApi();

        $middleware->alias([
            'admin' => EnsureUserIsAdmin::class,
        ]);

        $middleware->api(append: [
            SetLocale::class,
            TouchLastSeen::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // Always answer JSON for the API (401 / 403 / 404 / 422 / 429 / 500) with the shapes the front-end expects.
        $exceptions->shouldRenderJsonWhen(fn (Request $request) => $request->is('api/*') || $request->expectsJson());

        $exceptions->render(function (AuthenticationException $e, Request $request) {
            return response()->json(['message' => __('Unauthenticated.')], 401);
        });

        // Never leak model names / SQL ("No query results for model [App\\Models\\Message] 12") to API clients.
        $exceptions->render(function (ModelNotFoundException|NotFoundHttpException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json(['message' => __('Not Found.')], 404);
            }
        });
        $exceptions->render(function (AuthorizationException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json(['message' => $e->getMessage() && $e->getMessage() !== 'This action is unauthorized.' ? $e->getMessage() : __('This action is unauthorized.')], 403);
            }
        });
    })->create();
