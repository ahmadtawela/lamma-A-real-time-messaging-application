<?php

use App\Http\Controllers\Api\Admin;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CallController;
use App\Http\Controllers\Api\ContactController;
use App\Http\Controllers\Api\ConversationController;
use App\Http\Controllers\Api\GroupController;
use App\Http\Controllers\Api\LinkPreviewController;
use App\Http\Controllers\Api\MessageController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\SearchController;
use App\Http\Controllers\Api\StatusController;
use App\Http\Controllers\Api\UploadController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

/*
| Every route here is served under /api. Auth = Sanctum SPA cookie session (+ CSRF via GET /sanctum/csrf-cookie).
| Collections return { data: [...] }, single resources { data: {...} }, validation errors 422 { message, errors }.
*/

// ---- Guests ------------------------------------------------------------------------------------------------
Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:auth-sensitive');
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login');
Route::post('/two-factor-challenge', [AuthController::class, 'twoFactorChallenge'])->middleware('throttle:login');
Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:auth-sensitive');
Route::post('/reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:auth-sensitive');
Route::get('/email/verify/{id}/{hash}', [AuthController::class, 'verifyEmail'])->middleware(['signed', 'throttle:6,1'])->name('verification.verify');

// ---- Authenticated (even before email verification) --------------------------------------------------------
Route::middleware(['auth:sanctum', 'throttle:api'])->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'me']);
    Route::post('/email/verification-notification', [AuthController::class, 'resendVerification'])->middleware('throttle:auth-sensitive');

    // ---- Verified users --------------------------------------------------------------------------------------
    Route::middleware('verified')->group(function () {
        // Profile / account
        Route::put('/user', [ProfileController::class, 'update']);
        Route::put('/user/preferences', [ProfileController::class, 'preferences']);
        Route::post('/user/phone', [ProfileController::class, 'requestPhone'])->middleware('throttle:auth-sensitive');
        Route::post('/user/phone/verify', [ProfileController::class, 'verifyPhone'])->middleware('throttle:auth-sensitive');
        Route::delete('/user/phone', [ProfileController::class, 'removePhone']);
        Route::post('/user/avatar', [ProfileController::class, 'avatar'])->middleware('throttle:uploads');
        Route::put('/user/password', [ProfileController::class, 'changePassword'])->middleware('throttle:auth-sensitive');
        Route::post('/user/two-factor', [ProfileController::class, 'twoFactorSetup'])->middleware('throttle:auth-sensitive');
        Route::post('/user/two-factor/confirm', [ProfileController::class, 'twoFactorConfirm'])->middleware('throttle:auth-sensitive');
        Route::delete('/user/two-factor', [ProfileController::class, 'twoFactorDisable'])->middleware('throttle:auth-sensitive');
        Route::delete('/user', [ProfileController::class, 'destroy'])->middleware('throttle:auth-sensitive');
        Route::get('/users', [UserController::class, 'index']);

        // Conversations & messages
        Route::get('/conversations', [ConversationController::class, 'index']);
        Route::post('/conversations', [ConversationController::class, 'store']);
        Route::get('/conversations/{id}', [ConversationController::class, 'show'])->whereNumber('id');
        Route::put('/conversations/{id}', [ConversationController::class, 'update'])->whereNumber('id');
        Route::delete('/conversations/{id}', [ConversationController::class, 'destroy'])->whereNumber('id');
        Route::post('/conversations/{id}/read', [ConversationController::class, 'read'])->whereNumber('id');
        Route::delete('/conversations/{id}/messages', [ConversationController::class, 'clear'])->whereNumber('id');
        Route::get('/conversations/{id}/messages', [MessageController::class, 'index'])->whereNumber('id');

        Route::post('/messages', [MessageController::class, 'store'])->middleware('throttle:messages');
        Route::get('/messages/starred', [MessageController::class, 'starred']);
        Route::put('/messages/{id}', [MessageController::class, 'update'])->whereNumber('id');
        Route::delete('/messages/{id}', [MessageController::class, 'destroy'])->whereNumber('id');
        Route::post('/messages/{id}/read', [MessageController::class, 'read'])->whereNumber('id');
        Route::post('/messages/{id}/reaction', [MessageController::class, 'react'])->whereNumber('id');
        Route::post('/messages/{id}/vote', [MessageController::class, 'vote'])->whereNumber('id');
        Route::post('/messages/{id}/star', [MessageController::class, 'star'])->whereNumber('id');
        Route::post('/upload', [UploadController::class, 'store'])->middleware('throttle:uploads');

        // Groups
        Route::get('/groups', [GroupController::class, 'index']);
        Route::post('/groups', [GroupController::class, 'store']);
        Route::post('/groups/join/{code}', [GroupController::class, 'join']);
        Route::get('/groups/{id}', [GroupController::class, 'show'])->whereNumber('id');
        Route::put('/groups/{id}', [GroupController::class, 'update'])->whereNumber('id');
        Route::post('/groups/{id}/avatar', [GroupController::class, 'avatar'])->whereNumber('id')->middleware('throttle:uploads');
        Route::delete('/groups/{id}', [GroupController::class, 'destroy'])->whereNumber('id');
        Route::post('/groups/{id}/members', [GroupController::class, 'addMembers'])->whereNumber('id');
        Route::delete('/groups/{id}/members/{userId}', [GroupController::class, 'removeMember'])->whereNumber(['id', 'userId']);
        Route::post('/groups/{id}/admins', [GroupController::class, 'setAdmin'])->whereNumber('id');
        Route::delete('/groups/{id}/admins/{userId}', [GroupController::class, 'removeAdmin'])->whereNumber(['id', 'userId']);

        // Contacts, notifications, statuses, calls, search, reports
        Route::get('/contacts', [ContactController::class, 'index']);
        Route::post('/contacts', [ContactController::class, 'store'])->middleware('throttle:auth-sensitive');
        Route::delete('/contacts/{id}', [ContactController::class, 'destroy'])->whereNumber('id');
        Route::post('/contacts/{id}/block', [ContactController::class, 'block'])->whereNumber('id');
        Route::delete('/contacts/{id}/block', [ContactController::class, 'unblock'])->whereNumber('id');

        Route::get('/notifications', [NotificationController::class, 'index']);
        Route::post('/notifications/read-all', [NotificationController::class, 'readAll']);
        Route::post('/notifications/{id}/read', [NotificationController::class, 'markRead']);
        Route::delete('/notifications/{id}', [NotificationController::class, 'destroy']);

        Route::get('/statuses', [StatusController::class, 'index']);
        Route::post('/statuses', [StatusController::class, 'store'])->middleware('throttle:uploads');
        Route::delete('/statuses/{id}', [StatusController::class, 'destroy'])->whereNumber('id');
        Route::post('/statuses/{id}/view', [StatusController::class, 'view'])->whereNumber('id');
        Route::post('/statuses/{id}/reaction', [StatusController::class, 'react'])->whereNumber('id');

        // Calls: history + WebRTC signalling
        Route::get('/calls', [CallController::class, 'index']);
        Route::get('/calls/ice-servers', [CallController::class, 'iceServers']);
        Route::get('/calls/pending', [CallController::class, 'pending']);
        Route::post('/calls/start', [CallController::class, 'start'])->middleware('throttle:calls');
        Route::post('/calls/{id}/answer', [CallController::class, 'answer'])->whereNumber('id');
        Route::post('/calls/{id}/ice', [CallController::class, 'ice'])->whereNumber('id')->middleware('throttle:ice');
        Route::post('/calls/{id}/decline', [CallController::class, 'decline'])->whereNumber('id');
        Route::post('/calls/{id}/end', [CallController::class, 'end'])->whereNumber('id');
        Route::get('/link-preview', [LinkPreviewController::class, 'show'])->middleware('throttle:link-preview');
        Route::get('/search', [SearchController::class, 'index'])->middleware('throttle:60,1');
        Route::post('/reports', [ReportController::class, 'store'])->middleware('throttle:10,1');

        // ---- Admin (403 for everyone else) -----------------------------------------------------------------
        Route::prefix('admin')->middleware('admin')->group(function () {
            Route::get('/stats', Admin\StatsController::class);
            Route::get('/users', [Admin\UserController::class, 'index']);
            Route::get('/users/{id}/activity', [Admin\UserController::class, 'activity'])->whereNumber('id');
            Route::put('/users/{id}', [Admin\UserController::class, 'update'])->whereNumber('id');
            Route::delete('/users/{id}', [Admin\UserController::class, 'destroy'])->whereNumber('id');
            Route::get('/groups', [Admin\GroupController::class, 'index']);
            Route::delete('/groups/{id}', [Admin\GroupController::class, 'destroy'])->whereNumber('id');
            Route::get('/reports', [Admin\ReportController::class, 'index']);
            Route::put('/reports/{id}', [Admin\ReportController::class, 'update'])->whereNumber('id');
            Route::get('/logs', [Admin\SystemController::class, 'logs']);
            Route::get('/settings', [Admin\SystemController::class, 'settings']);
            Route::put('/settings', [Admin\SystemController::class, 'updateSettings']);
        });
    });
});
