<?php

namespace App\Providers;

use App\Models\Conversation;
use App\Models\Message;
use App\Policies\ConversationPolicy;
use App\Services\Sms\LogSmsSender;
use App\Services\Sms\SmsSender;
use App\Services\Sms\TwilioSmsSender;
use App\Policies\MessagePolicy;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(SmsSender::class, fn () => match (config('sms.driver')) { 'twilio' => new TwilioSmsSender, default => new LogSmsSender });
    }

    public function boot(): void
    {
        Gate::policy(Conversation::class, ConversationPolicy::class);
        Gate::policy(Message::class, MessagePolicy::class);

        // Password reset links point to the React app (/reset-password?token=...&email=...).
        ResetPassword::createUrlUsing(fn ($user, string $token) => rtrim(config('lamma.frontend_url'), '/').'/reset-password?token='.$token.'&email='.urlencode($user->getEmailForPasswordReset()));

        // 429 responses include Retry-After, which the front-end shows in its toast.
        RateLimiter::for('api', fn (Request $r) => Limit::perMinute(240)->by($r->user()?->id ?: $r->ip()));
        RateLimiter::for('login', fn (Request $r) => Limit::perMinute(5)->by(strtolower((string) $r->input('email')).'|'.$r->ip()));
        RateLimiter::for('auth-sensitive', fn (Request $r) => Limit::perMinute(6)->by(($r->user()?->id ?: $r->ip()).'|auth'));
        RateLimiter::for('messages', fn (Request $r) => Limit::perMinute(90)->by($r->user()?->id ?: $r->ip()));
        RateLimiter::for('calls', fn (Request $r) => Limit::perMinute(20)->by($r->user()?->id ?: $r->ip()));
        RateLimiter::for('ice', fn (Request $r) => Limit::perMinute(600)->by($r->user()?->id ?: $r->ip()));
        RateLimiter::for('link-preview', fn (Request $r) => Limit::perMinute(40)->by($r->user()?->id ?: $r->ip()));
        RateLimiter::for('uploads', fn (Request $r) => Limit::perMinute(30)->by($r->user()?->id ?: $r->ip()));
    }
}
