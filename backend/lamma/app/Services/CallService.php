<?php

namespace App\Services;

use App\Events\CallEnded;
use App\Models\Call;
use App\Models\User;
use Illuminate\Support\Facades\Cache;

/** Call state machine: ringing → active → completed, or ringing → declined | cancelled | missed. */
class CallService
{
    public const RING_SECONDS = 60;
    public const MAX_ACTIVE_HOURS = 6;

    public function __construct(private NotifyService $notify) {}

    /** True while the user is ringing someone / being rung / in a live call. */
    public function isBusy(User $user): bool
    {
        return Call::query()
            ->where(fn ($q) => $q->where('caller_id', $user->id)->orWhere('callee_id', $user->id))
            ->where(fn ($q) => $q
                ->where(fn ($r) => $r->where('status', 'ringing')->where('created_at', '>', now()->subSeconds(self::RING_SECONDS + 5)))
                ->orWhere(fn ($a) => $a->where('status', 'active')->where('answered_at', '>', now()->subHours(self::MAX_ACTIVE_HOURS))))
            ->exists();
    }

    public function peerOf(Call $call, User $me): int
    {
        return $call->caller_id === $me->id ? $call->callee_id : $call->caller_id;
    }

    public function stashOffer(Call $call, string $sdp): void
    {
        Cache::put("call.offer.{$call->id}", $sdp, now()->addSeconds(self::RING_SECONDS + 30));
    }

    public function offer(Call $call): ?string
    {
        return Cache::get("call.offer.{$call->id}");
    }

    /** Ends a call that is still ringing/active and tells the other side. */
    public function finish(Call $call, string $status, int $notifyUserId, string $reason): Call
    {
        $duration = $call->answered_at ? max(0, now()->diffInSeconds($call->answered_at, true)) : 0;
        $call->forceFill(['status' => $status, 'ended_at' => now(), 'duration' => (int) $duration])->save();
        Cache::forget("call.offer.{$call->id}");
        broadcast(new CallEnded([$notifyUserId], ['call_id' => $call->id, 'reason' => $reason]))->toOthers();

        return $call;
    }

    /** Used by the scheduler: ringing calls nobody answered become "missed" for both sides. */
    public function expireRinging(): int
    {
        $n = 0;
        Call::where('status', 'ringing')->where('created_at', '<', now()->subSeconds(self::RING_SECONDS))->get()->each(function (Call $call) use (&$n) {
            $call->forceFill(['status' => 'missed', 'ended_at' => now()])->save();
            Cache::forget("call.offer.{$call->id}");
            broadcast(new CallEnded([$call->caller_id, $call->callee_id], ['call_id' => $call->id, 'reason' => 'missed']));
            if ($callee = User::find($call->callee_id)) {
                $this->notify->to($callee, 'missed_call', User::find($call->caller_id)?->name ?? '');
            }
            $n++;
        });

        return $n;
    }
}
