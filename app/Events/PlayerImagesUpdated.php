<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class PlayerImagesUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $player1Logo;
    public $player2Logo;

    /**
     * Create a new event instance.
     */
    public function __construct($player1Logo, $player2Logo)
    {
        $this->player1Logo = $player1Logo;
        $this->player2Logo = $player2Logo;
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
        return 'player-images.updated';
    }
}
