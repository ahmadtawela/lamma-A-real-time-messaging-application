<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('contacts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('contact_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('blocked_at')->nullable();
            $table->timestamps();
            $table->unique(['user_id', 'contact_id']);
        });

        Schema::create('statuses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('kind', 10);                                    // text | image | video
            $table->string('text', 700)->nullable();
            $table->string('color', 9)->nullable();
            $table->string('media_path')->nullable();
            $table->string('privacy', 10)->default('contacts');            // everyone | contacts
            $table->timestamp('expires_at')->index();
            $table->timestamps();
        });

        Schema::create('status_views', function (Blueprint $table) {
            $table->foreignId('status_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamp('viewed_at');
            $table->primary(['status_id', 'user_id']);
        });

        Schema::create('status_reactions', function (Blueprint $table) {
            $table->foreignId('status_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('emoji', 16);
            $table->primary(['status_id', 'user_id']);
        });

        Schema::create('calls', function (Blueprint $table) {
            $table->id();
            $table->foreignId('caller_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('callee_id')->constrained('users')->cascadeOnDelete();
            $table->string('kind', 10);                                    // voice | video
            $table->string('status', 12);                                  // completed | missed | declined | cancelled
            $table->unsignedInteger('duration')->default(0);
            $table->timestamps();
            $table->index(['caller_id', 'created_at']);
            $table->index(['callee_id', 'created_at']);
        });

        Schema::create('reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('reporter_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('reported_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('message_id')->nullable()->constrained()->nullOnDelete();
            $table->string('reason', 20);
            $table->string('status', 10)->default('open');                 // open | resolved | dismissed
            $table->timestamps();
        });

        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();
            $table->string('level', 10)->default('info');
            $table->string('message');
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->json('context')->nullable();
            $table->timestamps();
        });

        Schema::create('settings', function (Blueprint $table) {
            $table->string('key')->primary();
            $table->json('value')->nullable();
        });

        // Laravel database notifications (same schema as `php artisan make:notifications-table`)
        Schema::create('notifications', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('type');
            $table->morphs('notifiable');
            $table->text('data');
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        foreach (['notifications', 'settings', 'activity_logs', 'reports', 'calls', 'status_reactions', 'status_views', 'statuses', 'contacts'] as $t) {
            Schema::dropIfExists($t);
        }
    }
};
