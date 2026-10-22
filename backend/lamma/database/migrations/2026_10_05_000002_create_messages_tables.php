<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conversation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('sender_id')->constrained('users')->cascadeOnDelete();
            $table->string('client_id', 64)->nullable();                   // idempotency key from the client (optimistic UI)
            $table->string('type', 20)->default('text');                   // text,image,video,audio,voice,file,location,contact,poll,sticker,system
            $table->text('body')->nullable();
            $table->json('meta')->nullable();                              // location / contact / poll question / forwarded flag
            $table->foreignId('reply_to_id')->nullable()->constrained('messages')->nullOnDelete();
            $table->timestamp('delivered_at')->nullable();                 // aggregate: all recipients received it
            $table->timestamp('read_at')->nullable();                      // aggregate: all recipients read it
            $table->timestamp('pinned_at')->nullable();
            $table->timestamp('edited_at')->nullable();
            $table->softDeletes();
            $table->timestamps();
            $table->unique(['sender_id', 'client_id']);
            $table->index(['conversation_id', 'id']);
            // For production search over message bodies add a FULLTEXT index (MySQL) and swap LIKE for MATCH ... AGAINST.
        });

        Schema::create('message_receipts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('message_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamp('read_at')->nullable();
            $table->unique(['message_id', 'user_id']);
        });

        Schema::create('attachments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('message_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('disk', 20)->default('public');
            $table->string('path');
            $table->string('name');
            $table->string('mime', 120);
            $table->unsignedBigInteger('size');
            $table->unsignedInteger('duration')->nullable();               // voice / audio seconds
            $table->json('waveform')->nullable();
            $table->timestamps();
            $table->index('message_id');
        });

        Schema::create('reactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('message_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('emoji', 16);
            $table->timestamps();
            $table->unique(['message_id', 'user_id', 'emoji']);
        });

        Schema::create('poll_options', function (Blueprint $table) {
            $table->id();
            $table->foreignId('message_id')->constrained()->cascadeOnDelete();
            $table->string('text', 100);
        });

        Schema::create('poll_votes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('poll_option_id')->constrained()->cascadeOnDelete();
            $table->foreignId('message_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->unique(['message_id', 'user_id']);                     // single-choice poll
        });

        Schema::create('message_stars', function (Blueprint $table) {
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('message_id')->constrained()->cascadeOnDelete();
            $table->primary(['user_id', 'message_id']);
        });
    }

    public function down(): void
    {
        foreach (['message_stars', 'poll_votes', 'poll_options', 'reactions', 'attachments', 'message_receipts', 'messages'] as $t) {
            Schema::dropIfExists($t);
        }
    }
};
