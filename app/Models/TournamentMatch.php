<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TournamentMatch extends Model
{
    use HasFactory;

    protected $table = 'matches';

    protected $fillable = [
        'tournament_id',
        'remote_id',
        'tournament_name',
        'match_number',
        'category',
        'gender',
        'age_category',
        'ring_number',
        'round',
        'player1_name',
        'player1_team',
        'player1_remote_id',
        'player2_name',
        'player2_team',
        'player2_remote_id',
        'status',
        'winner',
        'result_details',
        'is_synced',
        'last_synced_at',
        'next_match_id',
        'next_match_slot',
    ];

    protected $casts = [
        'result_details' => 'array',
        'last_synced_at' => 'datetime',
        'is_synced' => 'boolean',
    ];

    /**
     * Mark the match as completed and ready for sync.
     */
    public function complete($winner, $details)
    {
        $this->update([
            'status' => 'completed',
            'winner' => $winner,
            'result_details' => $details,
            'is_synced' => false, // Needs to be synced
        ]);
    }

    /**
     * Mark the match as synced with online system.
     */
    public function markAsSynced()
    {
        $this->update([
            'is_synced' => true,
            'last_synced_at' => now(),
        ]);
    }
}
