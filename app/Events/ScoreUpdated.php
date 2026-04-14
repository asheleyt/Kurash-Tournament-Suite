<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ScoreUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public array $player1;

    public array $player2;

    public function __construct(array $player1, array $player2)
    {
        $this->player1 = $player1;
        $this->player2 = $player2;
    }

    public function broadcastOn(): Channel
    {
        return new Channel('kurash.score');
    }

    public function broadcastAs(): string
    {
        return 'score.updated';
    }
}

