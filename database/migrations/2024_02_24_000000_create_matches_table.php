<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('matches', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('remote_id')->nullable()->unique(); // ID from Online System
            $table->string('tournament_name')->nullable();
            $table->integer('match_number')->default(0);
            $table->string('category')->nullable();
            $table->string('round')->nullable();
            
            // Player Info
            $table->string('player1_name');
            $table->string('player1_team')->nullable();
            $table->string('player2_name');
            $table->string('player2_team')->nullable();

            // Match Status
            $table->enum('status', ['pending', 'current', 'completed'])->default('pending');
            $table->string('winner')->nullable(); // 'player1', 'player2', or specific ID
            
            // Detailed Results (JSON for flexibility: scores, time, penalties)
            $table->json('result_details')->nullable(); 
            
            // Sync Status
            $table->boolean('is_synced')->default(false); // True if result sent to online
            $table->timestamp('last_synced_at')->nullable(); // Last time we synced this specific match

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('matches');
    }
};
