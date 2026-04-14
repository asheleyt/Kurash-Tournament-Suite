<?php

namespace App\Http\Controllers;

use App\Events\TimerToggled;
use App\Events\ScoreUpdated;
use App\Events\BreakToggled;
use App\Events\MedicToggled;
use App\Events\JazoToggled;
use App\Events\WinnerToggled;
use App\Events\PlayerInfoUpdated;
use App\Events\PlayerTextUpdated;
use App\Events\PlayerImagesUpdated;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class BroadcastController extends Controller
{
    private const STATE_CACHE_KEY = 'kurash.broadcast.state.v1';
    private const BROADCAST_DEGRADED_UNTIL_KEY = 'kurash.broadcast.degraded_until.v1';
    private const BROADCAST_DEGRADED_COOLDOWN_SECONDS = 5;

    private function markBroadcastDegraded(array &$response, string $warning = 'Realtime broadcaster unavailable; cached scoreboard state was still updated.'): void
    {
        $response['broadcastingDegraded'] = true;
        $response['broadcastWarning'] = $warning;
    }

    private function dispatchBroadcastEventSafely(object $event, array &$response = []): bool
    {
        $degradedUntil = Cache::get(self::BROADCAST_DEGRADED_UNTIL_KEY);
        $degradedUntilTs = is_numeric($degradedUntil) ? (int) $degradedUntil : 0;
        if ($degradedUntilTs > now()->getTimestamp()) {
            $this->markBroadcastDegraded(
                $response,
                'Realtime broadcaster is reconnecting; cached scoreboard state was still updated.'
            );
            return false;
        }

        try {
            event($event);
            Cache::forget(self::BROADCAST_DEGRADED_UNTIL_KEY);
            return true;
        } catch (\Throwable $exception) {
            $cooldownUntil = now()->addSeconds(self::BROADCAST_DEGRADED_COOLDOWN_SECONDS);
            Cache::put(
                self::BROADCAST_DEGRADED_UNTIL_KEY,
                $cooldownUntil->getTimestamp(),
                $cooldownUntil
            );

            Log::warning('Broadcast dispatch failed; continuing with cached scoreboard state.', [
                'event' => get_class($event),
                'message' => $exception->getMessage(),
            ]);

            $this->markBroadcastDegraded($response);
            return false;
        }
    }

    public function currentState()
    {
        return response()->json([
            'status' => 'ok',
            'state' => $this->getCachedBroadcastState(),
        ]);
    }

    public function timerToggle(Request $request)
    {
        $data = $request->validate([
            'isRunning' => ['required', 'boolean'],
            'time' => ['required', 'integer'],
            'activeTimer' => ['nullable', 'string'],
            'timerPlayer' => ['nullable', 'string'],
        ]);

        $response = ['status' => 'ok'];

        $this->dispatchBroadcastEventSafely(new TimerToggled(
            $data['isRunning'],
            $data['time'],
            $data['activeTimer'] ?? null,
            $data['timerPlayer'] ?? null
        ), $response);
        $this->rememberBroadcastState([
            'timer' => [
                'isRunning' => $data['isRunning'],
                'time' => $data['time'],
                'activeTimer' => $data['activeTimer'] ?? null,
                'timerPlayer' => $data['timerPlayer'] ?? null,
            ],
        ]);

        return response()->json($response);
    }

    public function scoreUpdate(Request $request)
    {
        $data = $request->validate([
            'player1' => ['required', 'array'],
            'player1.k' => ['required', 'integer'],
            'player1.yo' => ['required', 'integer'],
            'player1.ch' => ['required', 'integer'],
            'player1.medic' => ['nullable', 'integer'],
            'player1.penalties' => ['nullable', 'array'],
            'player1.penalties.g' => ['boolean'],
            'player1.penalties.d' => ['boolean'],
            'player1.penalties.t' => ['boolean'],
            'player2' => ['required', 'array'],
            'player2.k' => ['required', 'integer'],
            'player2.yo' => ['required', 'integer'],
            'player2.ch' => ['required', 'integer'],
            'player2.medic' => ['nullable', 'integer'],
            'player2.penalties' => ['nullable', 'array'],
            'player2.penalties.g' => ['boolean'],
            'player2.penalties.d' => ['boolean'],
            'player2.penalties.t' => ['boolean'],
        ]);

        $response = ['status' => 'ok'];

        $this->dispatchBroadcastEventSafely(new ScoreUpdated($data['player1'], $data['player2']), $response);
        $this->rememberBroadcastState([
            'score' => [
                'player1' => $data['player1'],
                'player2' => $data['player2'],
            ],
        ]);

        return response()->json($response);
    }

    public function breakToggle(Request $request)
    {
        $data = $request->validate([
            'isBreak' => ['required', 'boolean'],
        ]);

        $response = ['status' => 'ok'];

        $this->dispatchBroadcastEventSafely(new BreakToggled($data['isBreak']), $response);
        $this->rememberBroadcastState([
            'break' => ['isBreak' => $data['isBreak']],
        ]);

        return response()->json($response);
    }

    public function medicToggle(Request $request)
    {
        $data = $request->validate([
            'isMedic' => ['required', 'boolean'],
            'timerPlayer' => ['nullable', 'string'],
        ]);

        $response = ['status' => 'ok'];

        $this->dispatchBroadcastEventSafely(new MedicToggled($data['isMedic'], $data['timerPlayer'] ?? null), $response);
        $this->rememberBroadcastState([
            'medic' => [
                'isMedic' => $data['isMedic'],
                'timerPlayer' => $data['timerPlayer'] ?? null,
            ],
        ]);

        return response()->json($response);
    }

    public function jazoToggle(Request $request)
    {
        $data = $request->validate([
            'isJazo' => ['required', 'boolean'],
        ]);

        $response = ['status' => 'ok'];

        $this->dispatchBroadcastEventSafely(new JazoToggled($data['isJazo']), $response);
        $this->rememberBroadcastState([
            'jazo' => ['isJazo' => $data['isJazo']],
        ]);

        return response()->json($response);
    }

    public function winnerToggle(Request $request)
    {
        $data = $request->validate([
            'winner' => ['nullable', 'string', 'in:player1,player2'],
        ]);

        $response = ['status' => 'ok'];

        $this->dispatchBroadcastEventSafely(new WinnerToggled($data['winner'] ?? null), $response);
        $this->rememberBroadcastState([
            'winner' => ['winner' => $data['winner'] ?? null],
        ]);

        return response()->json($response);
    }

        public function batchUpdate(Request $request)
    {
        $data = $request->validate([
            'timer' => ['nullable', 'array'],
            'timer.isRunning' => ['required_with:timer', 'boolean'],
            'timer.time' => ['required_with:timer', 'integer'],
            'timer.activeTimer' => ['nullable', 'string'],
            'timer.timerPlayer' => ['nullable', 'string'],

            'score' => ['nullable', 'array'],
            'score.player1' => ['required_with:score', 'array'],
            'score.player1.k' => ['required_with:score', 'integer'],
            'score.player1.yo' => ['required_with:score', 'integer'],
            'score.player1.ch' => ['required_with:score', 'integer'],
            'score.player1.medic' => ['nullable', 'integer'],
            'score.player1.penalties' => ['nullable', 'array'],
            'score.player1.penalties.g' => ['boolean'],
            'score.player1.penalties.d' => ['boolean'],
            'score.player1.penalties.t' => ['boolean'],
            'score.player2' => ['required_with:score', 'array'],
            'score.player2.k' => ['required_with:score', 'integer'],
            'score.player2.yo' => ['required_with:score', 'integer'],
            'score.player2.ch' => ['required_with:score', 'integer'],
            'score.player2.medic' => ['nullable', 'integer'],
            'score.player2.penalties' => ['nullable', 'array'],
            'score.player2.penalties.g' => ['boolean'],
            'score.player2.penalties.d' => ['boolean'],
            'score.player2.penalties.t' => ['boolean'],

            'break' => ['nullable', 'array'],
            'break.isBreak' => ['required_with:break', 'boolean'],

            'medic' => ['nullable', 'array'],
            'medic.isMedic' => ['required_with:medic', 'boolean'],
            'medic.timerPlayer' => ['nullable', 'string'],

            'jazo' => ['nullable', 'array'],
            'jazo.isJazo' => ['required_with:jazo', 'boolean'],

            'winner' => ['nullable', 'array'],
            'winner.winner' => ['nullable', 'string', 'in:player1,player2'],

            'playerText' => ['nullable', 'array'],
            'playerText.player1' => ['required_with:playerText', 'array'],
            'playerText.player2' => ['required_with:playerText', 'array'],
            'playerText.category' => ['nullable', 'string'],
            'playerText.bracket' => ['nullable', 'string'],
            'playerText.stage' => ['nullable', 'string'],
            'playerText.gender' => ['nullable', 'string'],
            'playerText.matchId' => ['nullable'],

            'playerImages' => ['nullable', 'array'],
            'playerImages.player1Logo' => ['nullable', 'string'],
            'playerImages.player2Logo' => ['nullable', 'string'],
        ]);

        $response = ['status' => 'ok'];
        $statePatch = [];

        // Dispatch fast state updates first.
        if (isset($data['timer'])) {
            $this->dispatchBroadcastEventSafely(new TimerToggled(
                $data['timer']['isRunning'],
                $data['timer']['time'],
                $data['timer']['activeTimer'] ?? null,
                $data['timer']['timerPlayer'] ?? null
            ), $response);
            $statePatch['timer'] = [
                'isRunning' => $data['timer']['isRunning'],
                'time' => $data['timer']['time'],
                'activeTimer' => $data['timer']['activeTimer'] ?? null,
                'timerPlayer' => $data['timer']['timerPlayer'] ?? null,
            ];
        }

        if (isset($data['score'])) {
            $this->dispatchBroadcastEventSafely(new ScoreUpdated($data['score']['player1'], $data['score']['player2']), $response);
            $statePatch['score'] = [
                'player1' => $data['score']['player1'],
                'player2' => $data['score']['player2'],
            ];
        }

        if (isset($data['break'])) {
            $this->dispatchBroadcastEventSafely(new BreakToggled($data['break']['isBreak']), $response);
            $statePatch['break'] = ['isBreak' => $data['break']['isBreak']];
        }

        if (isset($data['medic'])) {
            $this->dispatchBroadcastEventSafely(new MedicToggled($data['medic']['isMedic'], $data['medic']['timerPlayer'] ?? null), $response);
            $statePatch['medic'] = [
                'isMedic' => $data['medic']['isMedic'],
                'timerPlayer' => $data['medic']['timerPlayer'] ?? null,
            ];
        }

        if (isset($data['jazo'])) {
            $this->dispatchBroadcastEventSafely(new JazoToggled($data['jazo']['isJazo']), $response);
            $statePatch['jazo'] = ['isJazo' => $data['jazo']['isJazo']];
        }

        if (isset($data['winner'])) {
            $this->dispatchBroadcastEventSafely(new WinnerToggled($data['winner']['winner'] ?? null), $response);
            $statePatch['winner'] = ['winner' => $data['winner']['winner'] ?? null];
        }

        if (isset($data['playerText'])) {
            $cached = $this->getCachedBroadcastState();
            $cachedPlayerText = (isset($cached['playerText']) && is_array($cached['playerText']))
                ? $cached['playerText']
                : [];

            $playerText = $data['playerText'];
            $p1Text = $playerText['player1'];
            if (isset($p1Text['clubLogo'])) unset($p1Text['clubLogo']);
            $p2Text = $playerText['player2'];
            if (isset($p2Text['clubLogo'])) unset($p2Text['clubLogo']);

            $resolveMeta = function (string $key) use ($playerText, $cachedPlayerText) {
                if (array_key_exists($key, $playerText)) {
                    return $playerText[$key];
                }

                return $cachedPlayerText[$key] ?? null;
            };

            $category = $resolveMeta('category');
            $bracket = $resolveMeta('bracket');
            $stage = $resolveMeta('stage');
            $gender = $resolveMeta('gender');
            $matchId = $resolveMeta('matchId');

            $this->dispatchBroadcastEventSafely(new PlayerTextUpdated(
                $p1Text,
                $p2Text,
                $category,
                $bracket,
                $stage,
                $gender,
                $matchId
            ), $response);
            $statePatch['playerText'] = [
                'player1' => $p1Text,
                'player2' => $p2Text,
                'category' => $category,
                'bracket' => $bracket,
                'stage' => $stage,
                'gender' => $gender,
                'matchId' => $matchId,
            ];
        }

        // Images may involve filesystem I/O, so do them last.
        if (isset($data['playerImages'])) {
            $p1Logo = $this->saveImage($data['playerImages']['player1Logo'] ?? null, 'p1');
            $p2Logo = $this->saveImage($data['playerImages']['player2Logo'] ?? null, 'p2');
            $this->dispatchBroadcastEventSafely(new PlayerImagesUpdated($p1Logo, $p2Logo), $response);
            $statePatch['playerImages'] = [
                'player1Logo' => $p1Logo,
                'player2Logo' => $p2Logo,
            ];

            // Provide saved URLs back to the sender so it can stop re-uploading base64 payloads.
            $response['player1Logo'] = $p1Logo;
            $response['player2Logo'] = $p2Logo;
        }

        if (!empty($statePatch)) {
            $this->rememberBroadcastState($statePatch);
        }

        return response()->json($response);
    }
public function updatePlayerInfo(Request $request)
    {
        Log::info('Update Player Info Request Received', $request->all());
        try {
            // 1. Validate and Dispatch Text Data
            $data = $request->validate([
                'player1' => ['required', 'array'],
                'player2' => ['required', 'array'],
                'category' => ['nullable', 'string'],
                'bracket' => ['nullable', 'string'],
                'stage' => ['nullable', 'string'],
                'gender' => ['nullable', 'string'],
                'matchId' => ['nullable'],
            ]);

            Log::info('Validation passed for Update Player Info');
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::error('Validation failed for Update Player Info', $e->errors());
            throw $e;
        }

        $cached = $this->getCachedBroadcastState();
        $cachedPlayerText = (isset($cached['playerText']) && is_array($cached['playerText']))
            ? $cached['playerText']
            : [];

        $resolveMeta = function (string $key) use ($data, $cachedPlayerText) {
            if (array_key_exists($key, $data)) {
                return $data[$key];
            }

            return $cachedPlayerText[$key] ?? null;
        };

        $category = $resolveMeta('category');
        $bracket = $resolveMeta('bracket');
        $stage = $resolveMeta('stage');
        $gender = $resolveMeta('gender');
        $matchId = $resolveMeta('matchId');

        // Force remove clubLogo to keep payload small
        $p1Text = $data['player1'];
        if (isset($p1Text['clubLogo'])) unset($p1Text['clubLogo']);

        $p2Text = $data['player2'];
        if (isset($p2Text['clubLogo'])) unset($p2Text['clubLogo']);

        Log::info('Dispatching PlayerTextUpdated event');
        $response = ['status' => 'ok'];
        $this->dispatchBroadcastEventSafely(new PlayerTextUpdated(
            $p1Text,
            $p2Text,
            $category,
            $bracket,
            $stage,
            $gender,
            $matchId
        ), $response);
        $this->rememberBroadcastState([
            'playerText' => [
                'player1' => $p1Text,
                'player2' => $p2Text,
                'category' => $category,
                'bracket' => $bracket,
                'stage' => $stage,
                'gender' => $gender,
                'matchId' => $matchId,
            ],
        ]);

        return response()->json($response);
    }

    public function updatePlayerImages(Request $request)
    {
        $data = $request->validate([
            'player1Logo' => ['nullable', 'string'],
            'player2Logo' => ['nullable', 'string'],
        ]);

        $p1Logo = $this->saveImage($data['player1Logo'] ?? null, 'p1');
        $p2Logo = $this->saveImage($data['player2Logo'] ?? null, 'p2');

        Log::info('Broadcasting images (processed)', [
            'p1_url' => $p1Logo,
            'p2_url' => $p2Logo,
        ]);

        // Always dispatch, even with nulls, so the client can clear images
        $response = ['status' => 'ok'];
        $this->dispatchBroadcastEventSafely(new PlayerImagesUpdated($p1Logo, $p2Logo), $response);
        $this->rememberBroadcastState([
            'playerImages' => [
                'player1Logo' => $p1Logo,
                'player2Logo' => $p2Logo,
            ],
        ]);

        return response()->json([
            ...$response,
            'player1Logo' => $p1Logo,
            'player2Logo' => $p2Logo,
        ]);
    }

    public function getPlayerLogo($filename)
    {
        $filename = basename((string) $filename);
        $public = public_path('images' . DIRECTORY_SEPARATOR . 'player-logos' . DIRECTORY_SEPARATOR . $filename);
        $storage = storage_path('app' . DIRECTORY_SEPARATOR . 'player-logos' . DIRECTORY_SEPARATOR . $filename);
        $path = null;
        if (is_file($public)) $path = $public;
        if ($path === null && is_file($storage)) $path = $storage;
        if ($path === null) {
            return response()->json(['error' => 'Not found'], 404);
        }
        $mime = function_exists('mime_content_type') ? @mime_content_type($path) : null;
        if (!$mime) $mime = 'image/png';
        return response()->file($path, ['Content-Type' => $mime]);
    }

    private function saveImage($base64Image, $playerId)
    {
        if (empty($base64Image)) {
            return null;
        }

        // If it's already a URL (doesn't start with data:), return it as is
        if (strpos($base64Image, 'data:') !== 0) {
            return $base64Image;
        }

        // Extract type
        if (!preg_match('/^data:image\/(\w+);base64,/', $base64Image, $type)) {
            return null;
        }

        $data = substr($base64Image, strpos($base64Image, ',') + 1);
        $extension = strtolower($type[1]); // jpg, png, gif

        // Decode
        $decodedData = base64_decode($data);
        if ($decodedData === false) {
            return null;
        }

        $filename = uniqid() . "_{$playerId}.{$extension}";

        $publicDir = public_path('images' . DIRECTORY_SEPARATOR . 'player-logos');
        try {
            if (@is_dir($publicDir) || @mkdir($publicDir, 0775, true)) {
                $targetPublic = rtrim($publicDir, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . $filename;
                @file_put_contents($targetPublic, $decodedData);
                if (is_file($targetPublic)) {
                    return '/images/player-logos/' . $filename;
                }
            }
        } catch (\Throwable $e) {
        }

        $storageDir = storage_path('app' . DIRECTORY_SEPARATOR . 'player-logos');
        if (!@is_dir($storageDir) && !@mkdir($storageDir, 0775, true)) {
            return null;
        }
        $targetStorage = rtrim($storageDir, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . $filename;
        try {
            @file_put_contents($targetStorage, $decodedData);
            if (is_file($targetStorage)) {
                return '/player-logos/' . $filename;
            }
        } catch (\Throwable $e) {
            return null;
        }

        return null;
    }

    private function getCachedBroadcastState(): array
    {
        $state = Cache::get(self::STATE_CACHE_KEY, []);
        return is_array($state) ? $state : [];
    }

    private function rememberBroadcastState(array $partialState): array
    {
        $currentState = $this->getCachedBroadcastState();
        $nextState = array_merge($currentState, $partialState, [
            'updatedAt' => now()->toIso8601String(),
        ]);

        Cache::forever(self::STATE_CACHE_KEY, $nextState);

        return $nextState;
    }
}
