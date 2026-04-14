<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class PlayerTextUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $player1;
    public $player2;
    public $category;
    public $bracket;
    public $stage;
    public $gender;
    public $matchId;

    /**
     * Create a new event instance.
     */
    public function __construct($player1, $player2, $category, $bracket, $stage, $gender, $matchId = null)
    {
        $this->player1 = $player1;
        $this->player2 = $player2;
        $this->category = $category;
        $this->bracket = $bracket;
        $this->stage = $stage;
        $this->gender = $gender;
        $this->matchId = $matchId;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new Channel('kurash.player-info'),
        ];
    }

    public function broadcastAs()
    {
        return 'player-text.updated';
    }
}
