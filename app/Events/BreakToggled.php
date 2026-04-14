<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class BreakToggled implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public bool $isBreak;

    public function __construct(bool $isBreak)
    {
        $this->isBreak = $isBreak;
    }

    public function broadcastOn(): Channel
    {
        return new Channel('kurash.break');
    }

    public function broadcastAs(): string
    {
        return 'break.toggled';
    }
}

