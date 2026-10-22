<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\Sms\SmsSender;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class PhoneContactsTest extends TestCase
{
    use RefreshDatabase;

    private object $sms;

    protected function setUp(): void
    {
        parent::setUp();
        $this->sms = new class implements SmsSender {
            public array $sent = [];
            public function send(string $to, string $message): void { $this->sent[] = [$to, $message]; }
            public function lastCode(): string { preg_match('/\b(\d{6})\b/', end($this->sent)[1], $m); return $m[1]; }
        };
        $this->app->instance(SmsSender::class, $this->sms);
    }

    private function verifyPhone(User $u, string $phone): void
    {
        Cache::forget("phone.cooldown.{$u->id}");
        $this->actingAs($u, 'sanctum')->postJson('/api/user/phone', ['phone' => $phone])->assertOk()->assertJsonPath('data.resend_in', 60);
        $this->actingAs($u, 'sanctum')->postJson('/api/user/phone/verify', ['code' => $this->sms->lastCode()])->assertOk()->assertJsonPath('data.phone_verified', true);
    }

    public function test_full_verification_flow_and_phone_is_private(): void
    {
        $me = User::factory()->create();
        $this->verifyPhone($me, '+90 555 111 22 33');
        $this->assertSame('+905551112233', $me->fresh()->phone);
        $this->assertNotNull($me->fresh()->phone_verified_at);
        $this->assertSame('+905551112233', $this->sms->sent[0][0]);

        /** @var User $other */
        $other = User::factory()->create();
        $this->actingAs($other, 'sanctum')->getJson('/api/users')->assertOk()->assertJsonMissingPath('data.0.phone');
    }

    public function test_invalid_numbers_wrong_codes_and_expiry_are_422(): void
    {
        /** @var User $me */
        $me = User::factory()->create();
        $this->actingAs($me, 'sanctum')->postJson('/api/user/phone', ['phone' => '0555'])->assertStatus(422)->assertJsonValidationErrors('phone');
        $this->actingAs($me, 'sanctum')->postJson('/api/user/phone/verify', ['code' => '123456'])->assertStatus(422)->assertJsonValidationErrors('code');   // nothing requested

        $this->actingAs($me, 'sanctum')->postJson('/api/user/phone', ['phone' => '+905551112233'])->assertOk();
        $this->actingAs($me, 'sanctum')->postJson('/api/user/phone/verify', ['code' => '000000'])->assertStatus(422)->assertJsonValidationErrors('code');
        $this->assertNull($me->fresh()->phone_verified_at);
    }

    public function test_code_is_burned_after_five_wrong_attempts(): void
    {
         /** @var User $me */
        $me = User::factory()->create();
        $this->actingAs($me, 'sanctum')->postJson('/api/user/phone', ['phone' => '+905551112233'])->assertOk();
        $good = $this->sms->lastCode(); $wrong = $good === '000000' ? '111111' : '000000';
        foreach (range(1, 5) as $_) {
            $this->actingAs($me, 'sanctum')->postJson('/api/user/phone/verify', ['code' => $wrong])->assertStatus(422);
        }
        $this->actingAs($me, 'sanctum')->postJson('/api/user/phone/verify', ['code' => $good])->assertStatus(422);      // even the right code no longer works
        $this->assertNull($me->fresh()->phone_verified_at);
    }

    public function test_resend_cooldown_and_a_number_belongs_to_one_account(): void
    {
        /** @var User $a */
        $a = User::factory()->create();
        /** @var User $b */
        $b = User::factory()->create();
        $this->actingAs($a, 'sanctum')->postJson('/api/user/phone', ['phone' => '+905551112233'])->assertOk();
        $this->actingAs($a, 'sanctum')->postJson('/api/user/phone', ['phone' => '+905551112233'])->assertStatus(429)->assertHeader('Retry-After');

        $this->verifyPhone($a, '+905551112233');
        $this->actingAs($b, 'sanctum')->postJson('/api/user/phone', ['phone' => '+905551112233'])->assertStatus(422)->assertJsonValidationErrors('phone');
    }

    public function test_add_contact_by_phone(): void
    {
        /** @var User $me */
        $me = User::factory()->create();
        /** @var User $friend */
        $friend = User::factory()->create();
        $this->verifyPhone($friend, '+963944123456');

        $this->actingAs($me, 'sanctum')->postJson('/api/contacts', ['phone' => '+963 944 123 456'])->assertCreated()->assertJsonPath('data.id', $friend->id)->assertJsonMissingPath('data.phone');
        $this->assertDatabaseHas('contacts', ['user_id' => $me->id, 'contact_id' => $friend->id]);
        $this->assertSame('contact_request', $friend->notifications()->first()->data['type']);
    }

    public function test_unknown_unverified_and_hidden_numbers_all_answer_202(): void
    {
        /** @var User $me */
        $me = User::factory()->create();
        /** @var User $unverified */
        $unverified = User::factory()->create(['phone' => '+905550000001']);                          // phone present but never verified
        /** @var User $hidden */
        $hidden = User::factory()->create(['settings' => ['phone_discoverable' => false]]);
        $this->verifyPhone($hidden, '+905550000002');

        foreach (['+905559999999', '+905550000001', '+905550000002'] as $n) {
            $this->actingAs($me, 'sanctum')->postJson('/api/contacts', ['phone' => $n])->assertStatus(202)->assertJson(['invited' => true]);
        }
        $this->assertDatabaseCount('contacts', 0);
        $this->assertNotNull($unverified);
    }

    public function test_contact_requires_one_identifier_and_validates_phone(): void
    {
        /** @var User $me */
        $me = User::factory()->create();
        $this->actingAs($me, 'sanctum')->postJson('/api/contacts', [])->assertStatus(422);
        $this->actingAs($me, 'sanctum')->postJson('/api/contacts', ['phone' => 'abc'])->assertStatus(422)->assertJsonValidationErrors('phone');
    }

    public function test_removing_the_phone_and_discoverability_setting(): void
    {
        /** @var User $me */
        $me = User::factory()->create();
        $this->verifyPhone($me, '+905551112233');
        $this->actingAs($me, 'sanctum')->putJson('/api/user/preferences', ['settings' => ['phone_discoverable' => false]])->assertOk();
        $this->actingAs($me, 'sanctum')->deleteJson('/api/user/phone')->assertOk()->assertJsonPath('data.phone_verified', false);
        $this->assertNull($me->fresh()->phone);
    }

    public function test_profile_update_can_no_longer_set_an_unverified_phone(): void
    {
        /** @var User $me */
        $me = User::factory()->create();
        $this->actingAs($me, 'sanctum')->putJson('/api/user', ['name' => 'New Name', 'phone' => '+905551112233'])->assertOk();
        $this->assertNull($me->fresh()->phone);
    }
}
