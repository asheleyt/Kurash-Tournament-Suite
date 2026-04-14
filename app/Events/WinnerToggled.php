<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class WinnerToggled implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * The winner identifier ('player1', 'player2', or null).
     */
    public ?string $winner;

    public function __construct(?string $winner)
    {
        $this->winner = $winner;
    }

    public function broadcastOn(): Channel
    {
        return new Channel('kurash.winner');
    }

    public function broadcastAs(): string
    {
        return 'winner.toggled';
    }
}
