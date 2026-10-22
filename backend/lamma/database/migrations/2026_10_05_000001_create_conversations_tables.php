<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('conversations', function (Blueprint $table) {
            $table->id();
            $table->string('type', 10);                                   // private | group
            $table->string('name')->nullable();
            $table->string('description', 255)->nullable();
            $table->string('avatar_path')->nullable();
            $table->string('invite_code', 24)->nullable()->unique();
            $table->boolean('restrict_messaging')->default(false);         // only admins can post
            $table->string('private_key', 40)->nullable()->unique();       // "minId:maxId" => one private chat per pair
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('last_message_at')->nullable()->index();
            $table->timestamps();
        });

        Schema::create('conversation_user', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conversation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('role', 10)->default('member');                 // member | admin
            $table->boolean('is_pinned')->default(false);
            $table->boolean('is_muted')->default(false);
            $table->boolean('is_archived')->default(false);
            $table->boolean('marked_unread')->default(false);
            $table->text('draft')->nullable();
            $table->unsignedBigInteger('last_read_message_id')->nullable();
            $table->unsignedBigInteger('cleared_message_id')->nullable();  // messages up to this id are hidden for this user
            $table->timestamp('hidden_at')->nullable();                    // "deleted" private chat (comes back on new message)
            $table->timestamp('joined_at')->nullable();
            $table->unique(['conversation_id', 'user_id']);
            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('conversation_user');
        Schema::dropIfExists('conversations');
    }
};
