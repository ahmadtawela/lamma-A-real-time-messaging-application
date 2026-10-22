<?php

namespace App\Http\Controllers\Api;

use App\Events\CallAnswered;
use App\Events\CallIceCandidate;
use App\Events\CallIncoming;
use App\Http\Controllers\Controller;
use App\Http\Resources\CallResource;
use App\Models\Call;
use App\Models\User;
use App\Services\CallService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * WebRTC signalling over HTTP + Reverb. The media itself flows peer-to-peer (or through TURN):
 *
 *   caller                                   server                                   callee
 *   POST /calls/start {callee_id,kind,sdp} → creates call (ringing), stores the offer  → CallIncoming {call, offer}
 *                                                                                       POST /calls/{id}/answer {sdp}
 *   ← CallAnswered {call_id, sdp}                                                      ←
 *   POST /calls/{id}/ice {candidate}  ⇄  CallIce {call_id, candidate}  ⇄  POST /calls/{id}/ice
 *   POST /calls/{id}/end | /decline    → CallEnded {call_id, reason} to the other side
 *
 * Only the two participants can touch a call (anyone else gets 404); SDP/ICE are validated and size-limited.
 */
class CallController extends Controller
{
    public function __construct(private CallService $calls) {}

    /** Finished calls only (ringing/active sessions are not history). */
    public function index(Request $request)
    {
        $me = $request->user()->id;

        return CallResource::collection(
            Call::whereIn('status', ['completed', 'missed', 'declined', 'cancelled'])
                ->where(fn ($q) => $q->where('caller_id', $me)->orWhere('callee_id', $me))
                ->latest('id')->limit(100)->get()
        );
    }

    /** STUN always; TURN with short-lived credentials (coturn "use-auth-secret") when TURN_HOST/TURN_SECRET are configured. */
    public function iceServers(Request $request): JsonResponse
    {
        $servers = [['urls' => config('lamma.webrtc.stun')]];
        $turn = config('lamma.webrtc.turn');
        if (! empty($turn['host']) && ! empty($turn['secret'])) {
            $username = (time() + $turn['ttl']).':'.$request->user()->id;
            $servers[] = [
                'urls' => ["turn:{$turn['host']}:{$turn['port']}?transport=udp", "turn:{$turn['host']}:{$turn['port']}?transport=tcp"],
                'username' => $username,
                'credential' => base64_encode(hash_hmac('sha1', $username, $turn['secret'], true)),
            ];
        }

        return response()->json(['data' => ['ice_servers' => $servers, 'ttl' => $turn['ttl']]]);
    }

    /** A call that is ringing for me right now (used when the app opens/reconnects after the realtime event was missed). */
    public function pending(Request $request): JsonResponse
    {
        $call = Call::where('callee_id', $request->user()->id)->where('status', 'ringing')
            ->where('created_at', '>', now()->subSeconds(CallService::RING_SECONDS))->latest('id')->first();
        $offer = $call ? $this->calls->offer($call) : null;
        if (! $call || ! $offer) {
            return response()->json(['data' => null]);
        }

        return response()->json(['data' => $this->incomingPayload($call, $offer)]);
    }

    public function start(Request $request): JsonResponse
    {
        $me = $request->user();
        $data = $request->validate([
            'callee_id' => ['required', 'integer', 'exists:users,id', Rule::notIn([$me->id])],
            'kind' => ['required', Rule::in(['voice', 'video'])],
            'sdp' => ['required', 'string', 'max:30000'],
        ]);
        $callee = User::whereNull('blocked_at')->findOrFail($data['callee_id']);

        abort_if(in_array($callee->id, $me->blockedIds(), true) || in_array($callee->id, $me->blockedByIds(), true), 403, __('You cannot call this user.'));
        abort_if($this->calls->isBusy($me), 409, __('You are already in a call.'));
        if ($this->calls->isBusy($callee)) {
            return response()->json(['message' => __('The user is busy.'), 'reason' => 'busy'], 409);
        }

        $call = Call::create(['caller_id' => $me->id, 'callee_id' => $callee->id, 'kind' => $data['kind'], 'status' => 'ringing', 'duration' => 0]);
        $this->calls->stashOffer($call, $data['sdp']);
        broadcast(new CallIncoming([$callee->id], ['call' => $this->incomingPayload($call, $data['sdp'])]))->toOthers();

        return response()->json(['data' => ['id' => $call->id, 'status' => 'ringing', 'peer_id' => $callee->id]], 201);
    }

    public function answer(Request $request, int $id): JsonResponse
    {
        $data = $request->validate(['sdp' => ['required', 'string', 'max:30000']]);
        $call = $this->forCallee($request->user(), $id);
        abort_unless($call->status === 'ringing', 409, __('This call is no longer ringing.'));

        $call->forceFill(['status' => 'active', 'answered_at' => now()])->save();
        broadcast(new CallAnswered([$call->caller_id], ['call_id' => $call->id, 'sdp' => $data['sdp']]))->toOthers();

        return response()->json(['data' => ['id' => $call->id, 'status' => 'active']]);
    }

    public function ice(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'candidate' => ['required', 'array'],
            'candidate.candidate' => ['present', 'string', 'max:2000'],      // empty string = end-of-candidates
            'candidate.sdpMid' => ['nullable', 'string', 'max:64'],
            'candidate.sdpMLineIndex' => ['nullable', 'integer', 'min:0', 'max:16'],
            'candidate.usernameFragment' => ['nullable', 'string', 'max:64'],
        ]);
        $me = $request->user();
        $call = $this->forParticipant($me, $id);
        abort_unless(in_array($call->status, ['ringing', 'active'], true), 409);

        broadcast(new CallIceCandidate([$this->calls->peerOf($call, $me)], ['call_id' => $call->id, 'candidate' => $data['candidate']]))->toOthers();

        return response()->json(null, 204);
    }

    /** Callee rejects an incoming call. */
    public function decline(Request $request, int $id): JsonResponse
    {
        $me = $request->user();
        $call = $this->forCallee($me, $id);
        abort_unless($call->status === 'ringing', 409);
        $this->calls->finish($call, 'declined', $call->caller_id, $request->input('reason') === 'busy' ? 'busy' : 'declined');

        return response()->json(['data' => ['id' => $call->id, 'status' => 'declined']]);
    }

    /** Hang up: completed if answered, "cancelled" if the caller gives up while ringing, "declined" if the callee leaves while ringing. */
    public function end(Request $request, int $id): JsonResponse
    {
        $me = $request->user();
        $call = $this->forParticipant($me, $id);
        if (! in_array($call->status, ['ringing', 'active'], true)) {
            return response()->json(['data' => ['id' => $call->id, 'status' => $call->status]]);     // idempotent
        }
        $status = $call->status === 'active' ? 'completed' : ($call->caller_id === $me->id ? 'cancelled' : 'declined');
        $this->calls->finish($call, $status, $this->calls->peerOf($call, $me), $status === 'completed' ? 'ended' : $status);

        return response()->json(['data' => ['id' => $call->id, 'status' => $status, 'duration' => $call->duration]]);
    }

    private function forParticipant(User $me, int $id): Call
    {
        return Call::where(fn ($q) => $q->where('caller_id', $me->id)->orWhere('callee_id', $me->id))->findOrFail($id);    // 404 for outsiders
    }

    private function forCallee(User $me, int $id): Call
    {
        return Call::where('callee_id', $me->id)->findOrFail($id);
    }

    private function incomingPayload(Call $call, string $offer): array
    {
        $caller = User::findOrFail($call->caller_id);

        return ['id' => $call->id, 'kind' => $call->kind, 'offer' => $offer, 'caller' => ['id' => $caller->id, 'name' => $caller->name, 'avatar_url' => $caller->avatarUrl()]];
    }
}
