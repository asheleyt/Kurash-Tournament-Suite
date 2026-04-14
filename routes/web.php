<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;
use App\Http\Controllers\BroadcastController;
use App\Http\Controllers\TournamentController;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canRegister' => Features::enabled(Features::registration()),
    ]);
})->name('home');

Route::get('dashboard', function () {
    return Inertia::render('Dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');

require __DIR__ . '/settings.php';

// Kurash
Route::get('/match', function () {
    return Inertia::render('Match');
});

Route::get('/kurashScoreBoard', function () {
    return Inertia::render('kurashScoreBoard');
});

Route::get('/ringMatchOrder', function () {
    return Inertia::render('ringMatchOrder');
});

Route::get('/refereeController', function () {
    return Inertia::render('refereeController');
});


Route::post('/broadcast/timer-toggle', [BroadcastController::class, 'timerToggle'])
    ->name('broadcast.timer-toggle');

Route::post('/broadcast/score-update', [BroadcastController::class, 'scoreUpdate'])
    ->name('broadcast.score-update');

Route::post('/broadcast/break-toggle', [BroadcastController::class, 'breakToggle'])
    ->name('broadcast.break-toggle');

Route::post('/broadcast/medic-toggle', [BroadcastController::class, 'medicToggle'])
    ->name('broadcast.medic-toggle');

Route::post('/broadcast/jazo-toggle', [BroadcastController::class, 'jazoToggle'])
    ->name('broadcast.jazo-toggle');

Route::post('/broadcast/winner-toggle', [BroadcastController::class, 'winnerToggle'])
    ->name('broadcast.winner-toggle');

Route::post('/broadcast/player-info-update', [BroadcastController::class, 'updatePlayerInfo'])
    ->name('broadcast.player-info-update');

Route::post('/broadcast/player-images-update', [BroadcastController::class, 'updatePlayerImages'])
    ->name('broadcast.player-images-update');

Route::post('/broadcast/batch', [BroadcastController::class, 'batchUpdate'])
    ->name('broadcast.batch');

Route::get('/broadcast/state', [BroadcastController::class, 'currentState'])
    ->name('broadcast.state');



Route::get('/player-logos/{filename}', [BroadcastController::class, 'getPlayerLogo'])
    ->name('player-logos.show');

// Runtime configuration for the frontend (read-only)
Route::get('/config.js', function (\Illuminate\Http\Request $request) {
    // Frontend needs the same "remote admin API" base the backend sync service uses.
    // Prefer KURASH_API_BASE for backward compatibility, but fall back to KURASH_REMOTE_API_BASE.
    $apiBase = env('KURASH_API_BASE', env('KURASH_REMOTE_API_BASE', env('API_BASE_URL', '')));
    $apiKey = env('KURASH_API_KEY', env('API_KEY', 'kurash-scoreboard'));
    $localBackendBase = env('KURASH_LOCAL_BACKEND_BASE_URL', rtrim(config('app.url'), '/'));
    $reverbScheme = env('REVERB_SCHEME', env('PUSHER_SCHEME', 'http'));
    $reverbHost = env('REVERB_HOST') ?: $request->getHost();
    $reverbPort = env('REVERB_PORT', env('PUSHER_PORT', $reverbScheme === 'https' ? 443 : 80));
    $reverbAppKey = env('REVERB_APP_KEY', env('PUSHER_APP_KEY', ''));
    $payload = "window.__KURASH_CONFIG__ = " . json_encode([
        'KURASH_API_BASE' => rtrim($apiBase, '/'),
        'KURASH_API_KEY' => $apiKey,
        'KURASH_LOCAL_BACKEND_BASE_URL' => rtrim($localBackendBase, '/'),
        'REVERB_APP_KEY' => $reverbAppKey,
        'REVERB_HOST' => $reverbHost,
        'REVERB_PORT' => is_numeric($reverbPort) ? (int) $reverbPort : $reverbPort,
        'REVERB_SCHEME' => $reverbScheme,
    ]) . ";";
    return response($payload, 200)
        ->header('Content-Type', 'application/javascript; charset=utf-8')
        ->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
});

// Club logos saved under storage (not under /api)
Route::get('/team-logos/{filename}', [TournamentController::class, 'getTeamLogo'])->name('team-logos.show');
