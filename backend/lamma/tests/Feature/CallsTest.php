<?php

namespace Tests\Feature;

use App\Events\CallAnswered;
use App\Events\CallEnded;
use App\Events\CallIceCandidate;
use App\Events\CallIncoming;
use App\Models\Call;
use App\Models\User;
use App\Services\CallService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class CallsTest extends TestCase
{
    use RefreshDatabase;

    private User $alice;
    private User $bob;
    private User $eve;

    protected function setUp(): void
    {
        parent::setUp();
        $this->alice = User::factory()->create();
        $this->bob = User::factory()->create();
        $this->eve = User::factory()->create();
    }

    private function start(User $as, User $to, string $kind = 'voice')
    {
        return $this->actingAs($as, 'sanctum')->postJson('/api/calls/start', ['callee_id' => $to->id, 'kind' => $kind, 'sdp' => 'v=0 fake-offer']);
    }

    public function test_full_call_flow_relays_signalling_to_the_other_side_only(): void
    {
        Event::fake([CallIncoming::class, CallAnswered::class, CallIceCandidate::class, CallEnded::class]);

        $id = $this->start($this->alice, $this->bob, 'video')->assertCreated()->json('data.id');
        Event::assertDispatched(CallIncoming::class, fn ($e) => $e->recipientIds === [$this->bob->id] && $e->payload['call']['offer'] === 'v=0 fake-offer' && $e->payload['call']['kind'] === 'video');

        $this->actingAs($this->bob, 'sanctum')->postJson("/api/calls/$id/answer", ['sdp' => 'v=0 fake-answer'])->assertOk()->assertJsonPath('data.status', 'active');
        Event::assertDispatched(CallAnswered::class, fn ($e) => $e->recipientIds === [$this->alice->id] && $e->payload['sdp'] === 'v=0 fake-answer');

        $cand = ['candidate' => 'candidate:1 1 udp 2122 10.0.0.2 5000 typ host', 'sdpMid' => '0', 'sdpMLineIndex' => 0];
        $this->actingAs($this->alice, 'sanctum')->postJson("/api/calls/$id/ice", ['candidate' => $cand])->assertNoContent();
        Event::assertDispatched(CallIceCandidate::class, fn ($e) => $e->recipientIds === [$this->bob->id]);

        $this->actingAs($this->bob, 'sanctum')->postJson("/api/calls/$id/end")->assertOk()->assertJsonPath('data.status', 'completed');
        Event::assertDispatched(CallEnded::class, fn ($e) => $e->recipientIds === [$this->alice->id] && $e->payload['reason'] === 'ended');
        $this->assertSame('completed', Call::find($id)->status);
    }

    public function test_outsiders_cannot_touch_a_call(): void
    {
        $id = $this->start($this->alice, $this->bob)->json('data.id');
        $this->actingAs($this->eve, 'sanctum')->postJson("/api/calls/$id/answer", ['sdp' => 'x'])->assertNotFound();
        $this->actingAs($this->eve, 'sanctum')->postJson("/api/calls/$id/ice", ['candidate' => ['candidate' => 'x']])->assertNotFound();
        $this->actingAs($this->eve, 'sanctum')->postJson("/api/calls/$id/end")->assertNotFound();
        // the caller cannot answer their own call
        $this->actingAs($this->alice, 'sanctum')->postJson("/api/calls/$id/answer", ['sdp' => 'x'])->assertNotFound();
    }

    public function test_busy_users_and_double_calls_are_rejected(): void
    {
        $this->start($this->alice, $this->bob)->assertCreated();
        $this->start($this->eve, $this->bob)->assertStatus(409)->assertJsonPath('reason', 'busy');
        $this->start($this->alice, $this->eve)->assertStatus(409);
    }

    public function test_blocked_users_cannot_call_each_other(): void
    {
        $this->actingAs($this->bob, 'sanctum')->postJson("/api/contacts/{$this->alice->id}/block")->assertOk();
        $this->start($this->alice, $this->bob)->assertForbidden();
        $this->start($this->bob, $this->alice)->assertForbidden();
    }

    public function test_decline_cancel_and_history(): void
    {
        $id = $this->start($this->alice, $this->bob)->json('data.id');
        $this->assertSame(0, $this->actingAs($this->alice, 'sanctum')->getJson('/api/calls')->json('data') ? count($this->actingAs($this->alice, 'sanctum')->getJson('/api/calls')->json('data')) : 0);   // ringing is not history
        $this->actingAs($this->bob, 'sanctum')->postJson("/api/calls/$id/decline")->assertOk();

        $id2 = $this->start($this->alice, $this->bob)->json('data.id');
        $this->actingAs($this->alice, 'sanctum')->postJson("/api/calls/$id2/end")->assertOk()->assertJsonPath('data.status', 'cancelled');

        $hist = $this->actingAs($this->alice, 'sanctum')->getJson('/api/calls')->assertOk()->json('data');
        $this->assertCount(2, $hist);
        $this->assertSame('outgoing', $hist[0]['direction']);
        $this->assertSame($this->bob->id, $hist[0]['peer_id']);
        $this->assertSame('incoming', $this->actingAs($this->bob, 'sanctum')->getJson('/api/calls')->json('data.0.direction'));
    }

    public function test_unanswered_calls_expire_to_missed_with_a_notification(): void
    {
        $id = $this->start($this->alice, $this->bob)->json('data.id');
        Call::whereKey($id)->update(['created_at' => now()->subSeconds(CallService::RING_SECONDS + 5)]);

        $this->assertSame(1, app(CallService::class)->expireRinging());
        $this->assertSame('missed', Call::find($id)->status);
        $this->assertSame('missed_call', $this->bob->notifications()->first()->data['type']);
    }

    public function test_pending_returns_a_ringing_call_for_the_callee_only(): void
    {
        $id = $this->start($this->alice, $this->bob)->json('data.id');
        $this->actingAs($this->bob, 'sanctum')->getJson('/api/calls/pending')->assertOk()->assertJsonPath('data.id', $id)->assertJsonPath('data.offer', 'v=0 fake-offer');
        $this->actingAs($this->alice, 'sanctum')->getJson('/api/calls/pending')->assertOk()->assertJsonPath('data', null);
    }

    public function test_ice_servers_include_turn_credentials_only_when_configured(): void
    {
        config(['lamma.webrtc.turn' => ['host' => null, 'port' => 3478, 'secret' => null, 'ttl' => 3600]]);
        $this->assertCount(1, $this->actingAs($this->alice, 'sanctum')->getJson('/api/calls/ice-servers')->json('data.ice_servers'));

        config(['lamma.webrtc.turn' => ['host' => 'turn.example.com', 'port' => 3478, 'secret' => 's3cret', 'ttl' => 600]]);
        $servers = $this->actingAs($this->alice, 'sanctum')->getJson('/api/calls/ice-servers')->json('data.ice_servers');
        $this->assertCount(2, $servers);
        [$expiry, $uid] = explode(':', $servers[1]['username']);
        $this->assertSame($this->alice->id, (int) $uid);
        $this->assertSame(base64_encode(hash_hmac('sha1', $servers[1]['username'], 's3cret', true)), $servers[1]['credential']);
        $this->assertGreaterThan(time(), (int) $expiry);
    }

    public function test_sdp_and_candidates_are_validated(): void
    {
        $this->actingAs($this->alice, 'sanctum')->postJson('/api/calls/start', ['callee_id' => $this->bob->id, 'kind' => 'voice'])->assertStatus(422)->assertJsonValidationErrors('sdp');
        $this->actingAs($this->alice, 'sanctum')->postJson('/api/calls/start', ['callee_id' => $this->alice->id, 'kind' => 'voice', 'sdp' => 'x'])->assertStatus(422);
        $this->actingAs($this->alice, 'sanctum')->postJson('/api/calls/start', ['callee_id' => $this->bob->id, 'kind' => 'voice', 'sdp' => str_repeat('a', 30001)])->assertStatus(422);
    }
}
