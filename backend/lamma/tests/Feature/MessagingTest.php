<?php

namespace Tests\Feature;

use App\Models\Conversation;
use App\Models\User;
use App\Services\ConversationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class MessagingTest extends TestCase
{
    use RefreshDatabase;

    private User $alice;
    private User $bob;
    private User $mallory;
    private Conversation $chat;

    protected function setUp(): void
    {
        parent::setUp();
        $this->alice = User::factory()->create();
        $this->bob = User::factory()->create();
        $this->mallory = User::factory()->create();
        $this->chat = app(ConversationService::class)->startPrivate($this->alice, $this->bob);
    }

    private function send(User $as, array $payload = [])
    {
        return $this->actingAs($as, 'sanctum')->postJson('/api/messages', array_merge(['conversation_id' => $this->chat->id, 'body' => 'مرحبا Ahmed'], $payload));
    }

    public function test_one_private_conversation_per_pair(): void
    {
        $again = $this->actingAs($this->bob, 'sanctum')->postJson('/api/conversations', ['user_id' => $this->alice->id])->assertOk();
        $this->assertSame($this->chat->id, $again->json('data.id'));
    }

    public function test_conversations_embed_participants_without_private_data(): void
    {
        $row = $this->actingAs($this->alice, 'sanctum')->getJson('/api/conversations')->assertOk()->json('data.0');
        $this->assertCount(2, $row['participants']);
        $bob = collect($row['participants'])->firstWhere('id', $this->bob->id);
        $this->assertSame($this->bob->name, $bob['name']);
        $this->assertArrayNotHasKey('email', $bob);
        $this->assertArrayNotHasKey('phone', $bob);
    }

    public function test_send_and_list_messages_with_cursor_pagination(): void
    {
        foreach (range(1, 30) as $i) {
            $this->send($this->alice, ['body' => "m$i"])->assertCreated();
        }
        $page1 = $this->actingAs($this->bob, 'sanctum')->getJson("/api/conversations/{$this->chat->id}/messages?limit=10")->assertOk();
        $this->assertCount(10, $page1->json('data'));
        $this->assertTrue($page1->json('meta.has_more'));
        $page2 = $this->actingAs($this->bob, 'sanctum')->getJson("/api/conversations/{$this->chat->id}/messages?limit=10&before=".$page1->json('meta.next_cursor'))->assertOk();
        $this->assertLessThan($page1->json('data.0.id'), $page2->json('data.9.id'));
    }

    public function test_client_id_makes_sending_idempotent(): void
    {
        $a = $this->send($this->alice, ['client_id' => 'abc-123'])->assertCreated();
        $b = $this->send($this->alice, ['client_id' => 'abc-123'])->assertOk();
        $this->assertSame($a->json('data.id'), $b->json('data.id'));
        $this->assertDatabaseCount('messages', 1);
    }

    public function test_outsiders_get_404_and_cannot_read_or_send(): void
    {
        $this->actingAs($this->mallory, 'sanctum')->getJson("/api/conversations/{$this->chat->id}")->assertNotFound();
        $this->actingAs($this->mallory, 'sanctum')->getJson("/api/conversations/{$this->chat->id}/messages")->assertNotFound();
        $this->send($this->mallory)->assertNotFound();
        $id = $this->send($this->alice)->json('data.id');
        $this->actingAs($this->mallory, 'sanctum')->postJson("/api/messages/$id/reaction", ['emoji' => '🔥'])->assertNotFound();
        $this->actingAs($this->mallory, 'sanctum')->deleteJson("/api/messages/$id")->assertNotFound();
    }

    public function test_only_the_author_can_edit_or_delete(): void
    {
        $id = $this->send($this->alice)->json('data.id');
        $this->actingAs($this->bob, 'sanctum')->putJson("/api/messages/$id", ['body' => 'hacked'])->assertForbidden();
        $this->actingAs($this->bob, 'sanctum')->deleteJson("/api/messages/$id")->assertForbidden();
        $this->actingAs($this->alice, 'sanctum')->putJson("/api/messages/$id", ['body' => 'edited'])->assertOk()->assertJsonPath('data.body', 'edited');
        $this->actingAs($this->alice, 'sanctum')->deleteJson("/api/messages/$id")->assertOk()->assertJsonPath('data.body', null);
    }

    public function test_reaction_toggle_and_allowlist(): void
    {
        $id = $this->send($this->alice)->json('data.id');
        $r = $this->actingAs($this->bob, 'sanctum')->postJson("/api/messages/$id/reaction", ['emoji' => '🔥'])->assertOk();
        $this->assertSame([$this->bob->id], $r->json('data.reactions.0.user_ids'));
        $this->actingAs($this->bob, 'sanctum')->postJson("/api/messages/$id/reaction", ['emoji' => '🔥'])->assertOk()->assertJsonCount(0, 'data.reactions');
        $this->actingAs($this->bob, 'sanctum')->postJson("/api/messages/$id/reaction", ['emoji' => '<script>'])->assertStatus(422);
    }

    public function test_reading_marks_messages_read_and_updates_unread_counts(): void
    {
        $this->send($this->alice)->assertCreated();
        $this->send($this->alice)->assertCreated();
        $list = $this->actingAs($this->bob, 'sanctum')->getJson('/api/conversations')->assertOk();
        $this->assertSame(2, $list->json('data.0.unread_count'));
        $this->actingAs($this->bob, 'sanctum')->postJson("/api/conversations/{$this->chat->id}/read")->assertOk()->assertJsonPath('data.unread_count', 0);
        $this->assertNotNull($this->actingAs($this->alice, 'sanctum')->getJson("/api/conversations/{$this->chat->id}/messages")->json('data.0.read_at'));
    }

    public function test_blocking_prevents_messages_in_both_directions(): void
    {
        $this->actingAs($this->alice, 'sanctum')->postJson("/api/contacts/{$this->bob->id}/block")->assertOk();
        $this->send($this->bob)->assertForbidden();
        $this->send($this->alice)->assertForbidden();
        $this->actingAs($this->alice, 'sanctum')->deleteJson("/api/contacts/{$this->bob->id}/block")->assertOk();
        $this->send($this->bob)->assertCreated();
    }

    public function test_restricted_group_only_lets_admins_post(): void
    {
        $group = app(ConversationService::class)->createGroup($this->alice, ['name' => 'Team'], [$this->bob->id]);
        $this->actingAs($this->alice, 'sanctum')->putJson("/api/groups/{$group->id}", ['restrict_messaging' => true])->assertOk()->assertJsonPath('data.restrict_messaging', true);
        $this->send($this->bob, ['conversation_id' => $group->id])->assertForbidden();
        $this->send($this->alice, ['conversation_id' => $group->id])->assertCreated();
        $this->actingAs($this->bob, 'sanctum')->putJson("/api/groups/{$group->id}", ['name' => 'x'])->assertForbidden();
    }

    public function test_group_always_keeps_an_admin(): void
    {
        $group = app(ConversationService::class)->createGroup($this->alice, ['name' => 'Team'], [$this->bob->id]);
        $this->actingAs($this->alice, 'sanctum')->deleteJson("/api/groups/{$group->id}/members/{$this->alice->id}")->assertNoContent();
        $this->assertTrue($group->fresh()->isAdmin($this->bob));
    }

    public function test_attachments_can_only_be_attached_by_their_uploader(): void
    {
        Storage::fake('public');
        $up = $this->actingAs($this->alice, 'sanctum')->postJson('/api/upload', ['file' => UploadedFile::fake()->image('pic.jpg')])->assertCreated();
        $attId = $up->json('data.id');

        $this->actingAs($this->bob, 'sanctum')->postJson('/api/messages', ['conversation_id' => $this->chat->id, 'type' => 'image', 'attachments' => [['id' => $attId]]])->assertNotFound();
        $this->send($this->alice, ['type' => 'image', 'body' => null, 'attachments' => [['id' => $attId]]])->assertCreated()->assertJsonPath('data.attachments.0.id', $attId);
    }

    public function test_dangerous_uploads_are_rejected(): void
    {
        Storage::fake('public');
        $this->actingAs($this->alice, 'sanctum')->postJson('/api/upload', ['file' => UploadedFile::fake()->create('shell.php', 5, 'text/x-php')])->assertStatus(422);
    }

    public function test_clear_chat_only_affects_the_caller(): void
    {
        $this->send($this->alice)->assertCreated();
        $this->actingAs($this->bob, 'sanctum')->deleteJson("/api/conversations/{$this->chat->id}/messages")->assertNoContent();
        $this->actingAs($this->bob, 'sanctum')->getJson("/api/conversations/{$this->chat->id}/messages")->assertJsonCount(0, 'data');
        $this->actingAs($this->alice, 'sanctum')->getJson("/api/conversations/{$this->chat->id}/messages")->assertJsonCount(1, 'data');
    }

    public function test_search_only_finds_messages_in_my_conversations(): void
    {
        $this->send($this->alice, ['body' => 'secret-launch-code'])->assertCreated();
        $this->actingAs($this->bob, 'sanctum')->getJson('/api/search?q=secret-launch')->assertOk()->assertJsonCount(1, 'data');
        $this->actingAs($this->mallory, 'sanctum')->getJson('/api/search?q=secret-launch')->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_validation_errors_are_422_with_field_keys(): void
    {
        $this->send($this->alice, ['body' => ''])->assertStatus(422)->assertJsonValidationErrors('body');
        $this->send($this->alice, ['type' => 'poll', 'body' => null, 'meta' => ['question' => 'q']])->assertStatus(422);
    }
}
