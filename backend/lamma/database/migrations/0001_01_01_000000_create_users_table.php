<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Replaces Laravel's default users migration (keeps password_reset_tokens + sessions).
return new class extends Migration {
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('username', 40)->unique();
            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password');
            $table->string('avatar_path')->nullable();
            $table->string('about', 140)->nullable();
            $table->string('phone', 32)->nullable();
            $table->string('locale', 2)->default('en');            // 'ar' | 'en'
            $table->boolean('is_admin')->default(false);
            $table->timestamp('blocked_at')->nullable();            // admin block
            $table->timestamp('last_seen_at')->nullable();
            $table->json('settings')->nullable();                   // privacy: last_seen_visibility, read_receipts, ...
            $table->text('two_factor_secret')->nullable();          // encrypted
            $table->text('two_factor_recovery_codes')->nullable();  // encrypted JSON of hashed codes
            $table->timestamp('two_factor_confirmed_at')->nullable();
            $table->rememberToken();
            $table->timestamps();
        });

        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sessions');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('users');
    }
};
