<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('matches', 'ring_number')) {
            Schema::table('matches', function (Blueprint $table) {
                // Ring / mat number coming from the admin system (used for multi-ring scoreboards).
                $table->unsignedInteger('ring_number')->nullable()->after('age_category');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('matches', 'ring_number')) {
            Schema::table('matches', function (Blueprint $table) {
                $table->dropColumn('ring_number');
            });
        }
    }
};

