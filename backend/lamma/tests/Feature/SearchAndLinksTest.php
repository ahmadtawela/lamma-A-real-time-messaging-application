<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\ConversationService;
use App\Support\Net\UrlGuard;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class SearchAndLinksTest extends TestCase
{
    use RefreshDatabase;

    public function test_search_finds_arabic_and_latin_words_and_prefixes(): void
    {
        /** @var User $a */
        $a = User::factory()->create();
        /** @var User $b */
        $b = User::factory()->create();
        $chat = app(ConversationService::class)->startPrivate($a, $b);
        foreach (['مرحبا بالعالم الجميل', 'Laravel + React + MySQL', 'the launch codes are ready'] as $body) {
            $this->actingAs($a, 'sanctum')->postJson('/api/messages', ['conversation_id' => $chat->id, 'body' => $body])->assertCreated();
        }
        $find = fn (string $q) => $this->actingAs($b, 'sanctum')->getJson('/api/search?type=messages&q='.urlencode($q))->assertOk()->json('data');

        $this->assertCount(1, $find('بالعالم'));
        $this->assertCount(1, $find('mysql'));
        $this->assertCount(1, $find('launch cod'));      // prefix + multiple words
        $this->assertCount(1, $find('the'));             // stop-word only => LIKE fallback
        $this->assertCount(0, $find('nothing-here'));
        $this->assertCount(0, $find('%%'));              // wildcards are escaped, not interpreted
    }

    public function test_link_preview_rejects_internal_addresses(): void
    {
        /** @var User $u */
        $u = User::factory()->create();
        foreach (['http://127.0.0.1/admin', 'http://169.254.169.254/latest/meta-data/', 'http://localhost:8080', 'file:///etc/passwd', 'http://[::1]/', 'ftp://example.com'] as $url) {
            $this->actingAs($u, 'sanctum')->getJson('/api/link-preview?url='.urlencode($url))->assertStatus(422)->assertJsonValidationErrors('url');
        }
    }

    public function test_link_preview_parses_open_graph_and_caches(): void
    {
        $this->app->instance(UrlGuard::class, new UrlGuard(fn () => ['93.184.216.34']));
        Http::fake(['*' => Http::response('<html><head><meta property="og:title" content="Hello"><meta property="og:description" content="World"><meta property="og:image" content="/i.png"></head></html>', 200, ['Content-Type' => 'text/html; charset=utf-8'])]);
        /** @var User $u */
        $u = User::factory()->create();

        $r = $this->actingAs($u, 'sanctum')->getJson('/api/link-preview?url='.urlencode('https://example.com/post'))->assertOk();
        $r->assertJsonPath('data.title', 'Hello')->assertJsonPath('data.image', 'https://example.com/i.png')->assertJsonPath('data.domain', 'example.com');
        $this->actingAs($u, 'sanctum')->getJson('/api/link-preview?url='.urlencode('https://example.com/post'))->assertOk();
        Http::assertSentCount(1);                          // second call served from cache
    }

    public function test_link_preview_blocks_redirects_to_internal_hosts(): void
    {
        $this->app->instance(UrlGuard::class, new UrlGuard(fn (string $h) => $h === 'evil.example.com' ? ['93.184.216.34'] : ['10.0.0.5']));
        Http::fake(['*' => Http::response('', 302, ['Location' => 'http://intranet.example.org/secret'])]);
        /** @var User $u */
        $u = User::factory()->create();

        $this->actingAs($u, 'sanctum')->getJson('/api/link-preview?url='.urlencode('https://evil.example.com/x'))->assertStatus(422);
    }

    public function test_server_errors_are_translated_to_arabic(): void
    {
        User::factory()->create(['email' => 'a@example.com']);
        $this->withHeaders(['Accept-Language' => 'ar'])->postJson('/api/login', ['email' => 'a@example.com', 'password' => 'bad'])
            ->assertStatus(422)->assertJsonPath('errors.email.0', 'بيانات الدخول هذه لا تطابق سجلاتنا.');
        $this->withHeaders(['Accept-Language' => 'ar'])->postJson('/api/register', ['name' => '', 'email' => 'x'])
            ->assertStatus(422)->assertJsonPath('errors.name.0', 'حقل الاسم مطلوب.');
        $this->withHeaders(['Accept-Language' => 'ar'])->getJson('/api/user')->assertUnauthorized()->assertJsonPath('message', 'يجب تسجيل الدخول أولاً.');
        $this->withHeaders(['Accept-Language' => 'en'])->getJson('/api/user')->assertJsonPath('message', 'Unauthenticated.');
    }

    public function test_not_found_does_not_leak_model_names(): void
    {
        /** @var User $u */
        $u = User::factory()->create();
        $r = $this->actingAs($u, 'sanctum')->getJson('/api/conversations/99999')->assertNotFound();
        $this->assertStringNotContainsString('App\\Models', $r->json('message'));
    }
}
