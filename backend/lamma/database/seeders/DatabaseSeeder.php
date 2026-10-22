<?php

namespace Database\Seeders;

use App\Models\Contact;
use App\Models\Message;
use App\Models\User;
use App\Services\ConversationService;
use Illuminate\Database\Seeder;

/** Development data: admin@lamma.test / password plus 20 users, private chats, 3 groups and ~300 messages. */
class DatabaseSeeder extends Seeder
{
    public function run(ConversationService $conversations): void
    {
        $admin = User::factory()->admin()->create(['name' => 'Ahmad Tawela', 'username' => 'ahmad', 'email' => 'admin@lamma.test', 'locale' => 'ar']);
        $users = User::factory(20)->create();
        $all = $users->prepend($admin);

        foreach ($users->take(12) as $u) {
            Contact::firstOrCreate(['user_id' => $admin->id, 'contact_id' => $u->id]);
            Contact::firstOrCreate(['user_id' => $u->id, 'contact_id' => $admin->id]);
        }

        $samples = ['مرحبا، كيف حالك؟', 'Hello, how are you?', 'مرحبا Ahmed, how are you?', 'Laravel + React + MySQL', 'تم إرسال الرسالة successfully', 'Sounds good, see you tomorrow!', 'شكرًا جزيلًا 👌'];
        $threads = [];
        foreach ($users->slice(1, 10) as $other) {
            $threads[] = $conversations->startPrivate($admin, $other);
        }
        foreach ([['فريق التصميم', 5], ['Laravel Devs', 6], ['Project Lamma', 7]] as [$name, $n]) {
            $threads[] = $conversations->createGroup($admin, ['name' => $name, 'description' => 'Seeded group'], $users->random($n)->pluck('id')->all());
        }

        foreach ($threads as $c) {
            $ids = $c->users()->pluck('users.id')->all();
            for ($i = 0; $i < 20; $i++) {
                $m = Message::create(['conversation_id' => $c->id, 'sender_id' => fake()->randomElement($ids), 'type' => 'text', 'body' => fake()->randomElement($samples)]);
                $m->forceFill(['created_at' => now()->subMinutes((20 - $i) * 7), 'updated_at' => now()->subMinutes((20 - $i) * 7)])->saveQuietly();
            }
            $c->forceFill(['last_message_at' => now()])->save();
        }
    }
}
