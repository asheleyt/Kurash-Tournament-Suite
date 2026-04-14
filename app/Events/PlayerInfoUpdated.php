<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class PlayerInfoUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public array $player1;
    public array $player2;
    public ?string $category;
    public ?string $stage;
    public ?string $gender;

    public function __construct(array $player1, array $player2, ?string $category = null, ?string $stage = null, ?string $gender = null)
    {
        $this->player1 = $player1;
        $this->player2 = $player2;
        $this->category = $category;
        $this->stage = $stage;
        $this->gender = $gender;
    }

    public function broadcastOn(): Channel
    {
        return new Channel('kurash.player-info');
    }

    public function broadcastAs(): string
    {
        return 'player-info.updated';
    }
}
