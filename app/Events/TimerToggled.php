<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class TimerToggled implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * The current running state of the timer.
     */
    public bool $isRunning;

    /**
     * The current time remaining (in seconds).
     */
    public int $time;

    public ?string $activeTimer;
    public ?string $timerPlayer;

    public function __construct(bool $isRunning, int $time, ?string $activeTimer = null, ?string $timerPlayer = null)
    {
        $this->isRunning = $isRunning;
        $this->time = $time;
        $this->activeTimer = $activeTimer;
        $this->timerPlayer = $timerPlayer;
    }

    public function broadcastOn(): Channel
    {
        // Simple public channel for now. You can scope this by match later.
        return new Channel('kurash.timer');
    }

    public function broadcastAs(): string
    {
        // Use a custom, predictable event name
        return 'timer.toggled';
    }
}

