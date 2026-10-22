<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\TwoFactor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_get_401_json(): void
    {
        $this->getJson('/api/user')->assertUnauthorized()->assertJson(['message' => 'Unauthenticated.']);
    }

    public function test_register_validates_with_laravel_422_shape(): void
    {
        $this->postJson('/api/register', ['name' => '', 'email' => 'nope', 'password' => '1'])
            ->assertStatus(422)->assertJsonValidationErrors(['name', 'email', 'password', 'terms']);
    }

    public function test_register_creates_unverified_user_and_logs_in(): void
    {
        $this->withSession([])->postJson('/api/register', ['name' => 'Sara', 'email' => 'sara@example.com', 'password' => 'secret-pass', 'password_confirmation' => 'secret-pass', 'terms' => true, 'locale' => 'ar'])
            ->assertCreated()->assertJsonPath('user.locale', 'ar')->assertJsonPath('user.email_verified_at', null);
        $this->assertDatabaseHas('users', ['email' => 'sara@example.com', 'is_admin' => false]);
    }

    public function test_cannot_escalate_privileges_through_registration(): void
    {
        $this->withSession([])->postJson('/api/register', ['name' => 'Evil', 'email' => 'evil@example.com', 'password' => 'secret-pass', 'password_confirmation' => 'secret-pass', 'terms' => true, 'is_admin' => true])->assertCreated();
        $this->assertFalse((bool) User::where('email', 'evil@example.com')->value('is_admin'));
    }

    public function test_login_failure_is_a_422_on_email_and_never_reveals_which_part_was_wrong(): void
    {
        User::factory()->create(['email' => 'a@example.com']);
        $this->postJson('/api/login', ['email' => 'a@example.com', 'password' => 'wrong'])->assertStatus(422)->assertJsonValidationErrors('email');
        $this->postJson('/api/login', ['email' => 'ghost@example.com', 'password' => 'wrong'])->assertStatus(422)->assertJsonValidationErrors('email');
    }

    public function test_login_success_and_logout(): void
    {
        $user = User::factory()->create(['email' => 'a@example.com']);
        $this->withSession([])->postJson('/api/login', ['email' => 'a@example.com', 'password' => 'password'])->assertOk()->assertJsonPath('user.id', $user->id);
    }

    public function test_blocked_user_cannot_log_in(): void
    {
        User::factory()->create(['email' => 'b@example.com', 'blocked_at' => now()]);
        $this->postJson('/api/login', ['email' => 'b@example.com', 'password' => 'password'])->assertStatus(422);
    }

    public function test_two_factor_challenge_flow(): void
    {
        $tf = new TwoFactor;
        $secret = $tf->generateSecret();
        User::factory()->create(['email' => 'tf@example.com'])->forceFill(['two_factor_secret' => $secret, 'two_factor_confirmed_at' => now(), 'two_factor_recovery_codes' => []])->save();

        $this->withSession([])->postJson('/api/login', ['email' => 'tf@example.com', 'password' => 'password'])->assertOk()->assertJson(['two_factor' => true]);
        $this->withSession([])->postJson('/api/two-factor-challenge', ['code' => '000000'])->assertStatus(422)->assertJsonValidationErrors('code');
        $this->withSession(['two_factor' => ['id' => User::where('email', 'tf@example.com')->first()->id, 'remember' => false, 'at' => now()->timestamp]])->postJson('/api/two-factor-challenge', ['code' => $tf->code($secret)])->assertOk()->assertJsonStructure(['user' => ['id']]);
    }

    public function test_unverified_users_are_blocked_from_the_app_api(): void
    {
        $user = User::factory()->unverified()->create();
        $this->actingAs($user, 'sanctum')->getJson('/api/conversations')->assertForbidden();
        $this->actingAs($user, 'sanctum')->getJson('/api/user')->assertOk();
    }

    public function test_admin_endpoints_are_403_for_regular_users_and_200_for_admins(): void
    {
        /** @var User $user */
        $user = User::factory()->createOne();
        $this->actingAs($user, 'sanctum')->getJson('/api/admin/stats')->assertForbidden();
        $this->actingAs(User::factory()->admin()->create(), 'sanctum')->getJson('/api/admin/stats')->assertOk()->assertJsonStructure(['data' => ['total_users', 'messages_per_day']]);
    }

    public function test_user_resource_hides_email_of_other_users(): void
    {
        /** @var User $me */
        $me = User::factory()->create();
        $other = User::factory()->create();
        $this->actingAs($me, 'sanctum')->getJson('/api/users')->assertOk()->assertJsonMissingPath('data.0.email');
        $this->actingAs($me, 'sanctum')->getJson('/api/user')->assertJsonPath('data.email', $me->email);
        $this->assertNotNull($other);
    }

    public function test_preferences_update_locale(): void
    {
        /** @var User $me */
        $me = User::factory()->create(['locale' => 'en']);
        $this->actingAs($me, 'sanctum')->putJson('/api/user/preferences', ['locale' => 'ar'])->assertOk()->assertJsonPath('data.locale', 'ar');
        $this->actingAs($me, 'sanctum')->putJson('/api/user/preferences', ['locale' => 'fr'])->assertStatus(422);
    }
}
