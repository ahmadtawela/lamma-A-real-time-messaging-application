<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * FULLTEXT indexes (MySQL 5.7+/8, MariaDB 10.5+, InnoDB). Other drivers (SQLite in tests) skip this migration and
 * App\Support\FullText transparently falls back to LIKE.
 *
 * For Chinese/Japanese/Korean content create the index WITH PARSER ngram instead. Arabic/Latin use the default parser.
 */
return new class extends Migration {
    private function supported(): bool
    {
        return in_array(DB::getDriverName(), ['mysql', 'mariadb'], true);
    }

    public function up(): void
    {
        if (! $this->supported()) {
            return;
        }
        DB::statement('ALTER TABLE messages ADD FULLTEXT INDEX ft_messages_body (body)');
        DB::statement('ALTER TABLE attachments ADD FULLTEXT INDEX ft_attachments_name (name)');
        DB::statement('ALTER TABLE users ADD FULLTEXT INDEX ft_users_name (name, username)');
        DB::statement('ALTER TABLE conversations ADD FULLTEXT INDEX ft_conversations_name (name)');
    }

    public function down(): void
    {
        if (! $this->supported()) {
            return;
        }
        DB::statement('ALTER TABLE messages DROP INDEX ft_messages_body');
        DB::statement('ALTER TABLE attachments DROP INDEX ft_attachments_name');
        DB::statement('ALTER TABLE users DROP INDEX ft_users_name');
        DB::statement('ALTER TABLE conversations DROP INDEX ft_conversations_name');
    }
};
