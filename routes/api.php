<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\ControllerDeviceProxyController;
use App\Http\Controllers\TournamentController;

// Health check endpoint used by the Electron splash screen.
Route::get('/status', [TournamentController::class, 'status']);

Route::post('/controller/pair', [ControllerDeviceProxyController::class, 'pair']);
Route::post('/controller/heartbeat', [ControllerDeviceProxyController::class, 'heartbeat']);
Route::get('/controller/assigned-setup', [ControllerDeviceProxyController::class, 'assignedSetup']);

/*
 * Scoreboard / referee JSON API (api middleware: no CSRF, JSON-friendly errors).
 * These live here so Electron and fetch() from the Inertia app never get HTML error pages.
 */
Route::get('/tournaments/sync-all', [TournamentController::class, 'syncAll']);
Route::get('/tournaments', [TournamentController::class, 'tournaments']);
Route::get('/tournaments/{id}/scoreboard-data', [TournamentController::class, 'scoreboardData']);
Route::get('/tournaments/{id}/rings/{ring}/queue', [TournamentController::class, 'ringQueue']);
Route::get('/tournaments/{id}/rings/{ring}/display-batch', [TournamentController::class, 'ringDisplayBatch']);
Route::get('/tournaments/{id}/rings/{ring}/queue-diagnostics', [TournamentController::class, 'ringQueueDiagnostics']);
Route::post('/tournament/sync', [TournamentController::class, 'sync']);

Route::get('/matches', [TournamentController::class, 'index']);
Route::post('/matches/import', [TournamentController::class, 'import']);
Route::post('/matches/sync-results', [TournamentController::class, 'syncPending']);
Route::delete('/matches/all', [TournamentController::class, 'destroyAll']);
Route::put('/matches/{id}/details', [TournamentController::class, 'updateDetails']);
Route::post('/matches/{id}/result', [TournamentController::class, 'postResult']);
Route::put('/matches/{id}', [TournamentController::class, 'update']);
Route::delete('/matches/{id}', [TournamentController::class, 'destroy']);

Route::get('/teams', [TournamentController::class, 'listTeams']);
Route::post('/teams/upload-logo', [TournamentController::class, 'uploadTeamLogo']);
