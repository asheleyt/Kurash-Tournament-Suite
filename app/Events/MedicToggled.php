<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MedicToggled implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public bool $isMedic;
    public ?string $timerPlayer;

    public function __construct(bool $isMedic, ?string $timerPlayer = null)
    {
        $this->isMedic = $isMedic;
        $this->timerPlayer = $timerPlayer;
    }

    public function broadcastOn(): Channel
    {
        return new Channel('kurash.medic');
    }

    public function broadcastAs(): string
    {
        return 'medic.toggled';
    }
}
