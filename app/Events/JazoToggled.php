<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class JazoToggled implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public bool $isJazo;

    public function __construct(bool $isJazo)
    {
        $this->isJazo = $isJazo;
    }

    public function broadcastOn(): Channel
    {
        return new Channel('kurash.jazo');
    }

    public function broadcastAs(): string
    {
        return 'jazo.toggled';
    }
}
