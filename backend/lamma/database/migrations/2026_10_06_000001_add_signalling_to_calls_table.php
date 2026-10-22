<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Calls become real sessions: ringing -> active -> completed | declined | cancelled | missed.
return new class extends Migration {
    public function up(): void
    {
        Schema::table('calls', function (Blueprint $table) {
            $table->timestamp('answered_at')->nullable()->after('duration');
            $table->timestamp('ended_at')->nullable()->after('answered_at');
            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::table('calls', function (Blueprint $table) {
            $table->dropIndex(['status', 'created_at']);
            $table->dropColumn(['answered_at', 'ended_at']);
        });
    }
};
