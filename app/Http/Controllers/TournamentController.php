<?php

namespace App\Http\Controllers;

use App\Models\TournamentMatch;
use App\Services\TournamentSyncService;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class TournamentController extends Controller
{
    protected $syncService;
    protected static ?bool $hasTournamentIdColumn = null;
    protected static ?bool $hasTournamentNameColumn = null;

    public function __construct(TournamentSyncService $syncService)
    {
        $this->syncService = $syncService;
    }

    /**
     * List matches for the scoreboard.
     * Optional filter: ?tournament_name=NAME
     */
    public function index(Request $request)
    {
        $query = TournamentMatch::orderBy('match_number');
        if ($request->filled('tournament_name')) {
            $query->where('tournament_name', $request->query('tournament_name'));
        }
        $matches = $query->get()->map(function($match) {
            // Map fields for frontend consistency with sync service
            $match->player_red_name = $match->player1_name;
            $match->player_blue_name = $match->player2_name;
            $match->player_red_team = $match->player1_team;
            $match->player_blue_team = $match->player2_team;
            $match->red_score = $match->result_details['score_p1']['k'] ?? $match->result_details['score_p1'] ?? 0;
            $match->blue_score = $match->result_details['score_p2']['k'] ?? $match->result_details['score_p2'] ?? 0;
            return $match;
        });
        
        // Group matches by category for brackets view
        $brackets = $matches->groupBy('category')->map(function ($items, $category) {
            // Use the remote_id of the first match's bracket if available, 
            // otherwise use the category name as a fallback ID
            return [
                'id' => $category, // Using category name as ID for local brackets
                'name' => $category,
                'matches' => $items->values()
            ];
        })->values();

        return response()->json([
            'success' => true,
            'count' => $matches->count(),
            'matches' => $matches,
            'brackets' => $brackets
        ]);
    }

    /**
     * List available tournaments from online server.
     */
    public function tournaments(\Illuminate\Http\Request $request)
    {
        try {
            if ($request->filled('admin_base')) {
                $this->syncService->setBaseUrl($request->query('admin_base'));
            }
            $result = $this->syncService->listTournaments();

            // Build known local names for "saved" indicator
            try {
                $localNames = \App\Models\TournamentMatch::whereNotNull('tournament_name')
                    ->distinct()
                    ->pluck('tournament_name')
                    ->map(function ($n) { return strtolower((string) $n); })
                    ->toArray();
            } catch (\Throwable $e) {
                $localNames = [];
            }

            if (!empty($result['success']) && !empty($result['tournaments'])) {
                // Persist ID->name map for local lookups
                try {
                    $map = [];
                    foreach ($result['tournaments'] as $t) {
                        if (isset($t['id']) && isset($t['name'])) {
                            $map[(string)$t['id']] = (string)$t['name'];
                        }
                    }
                    if (!empty($map)) {
                        $mapPath = storage_path('app/tournament_map.json');
                        @file_put_contents($mapPath, json_encode($map, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
                    }
                } catch (\Throwable $e) {
                    // ignore
                }
                $withSaved = array_map(function ($t) use ($localNames) {
                    $name = (string) ($t['name'] ?? 'Tournament');
                    $t['saved'] = in_array(strtolower($name), $localNames, true);
                    return $t;
                }, $result['tournaments']);
                return response()->json(['success' => true, 'tournaments' => $withSaved]);
            }

            // Fallback to local-known tournaments when remote is unavailable
            $tournaments = [];

            // 1) Prefer stored ID->name map if available (stable across restarts)
            try {
                $mapPath = storage_path('app/tournament_map.json');
                if (file_exists($mapPath)) {
                    $raw = file_get_contents($mapPath);
                    $map = json_decode($raw, true);
                    if (is_array($map)) {
                        foreach ($map as $id => $name) {
                            if ($name) {
                                $tournaments[] = ['id' => is_numeric($id) ? (int) $id : $id, 'name' => (string) $name];
                            }
                        }
                    }
                }
            } catch (\Throwable $e) {
                // ignore
            }

            // 2) If still empty, derive from distinct local tournament_name values
            if (empty($tournaments)) {
                try {
                    $names = TournamentMatch::whereNotNull('tournament_name')
                        ->distinct()
                        ->pluck('tournament_name')
                        ->filter()
                        ->values();

                    if ($names->isNotEmpty()) {
                        $map = [];
                        foreach ($names as $name) {
                            // Stable unsigned 32-bit ID from name
                            $id = sprintf('%u', crc32((string) $name));
                            $tournaments[] = ['id' => (int) $id, 'name' => (string) $name];
                            $map[(string) $id] = (string) $name;
                        }
                        // Persist generated map for use by scoreboardData local fallback
                        try {
                            $mapPath = storage_path('app/tournament_map.json');
                            @file_put_contents($mapPath, json_encode($map, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
                        } catch (\Throwable $e) {
                            // ignore
                        }
                    }
                } catch (\Throwable $e) {
                    // Database might not be ready; ignore and continue with empty list
                }
            }

            $withSaved = array_map(function ($t) {
                $t['saved'] = true; // Derived from local DB or map, hence saved
                return $t;
            }, $tournaments);

            return response()->json([
                'success' => true,
                'source' => 'local',
                'tournaments' => $withSaved,
                'message' => $result['message'] ?? 'Using local tournaments list',
            ], 200);
        } catch (\Throwable $e) {
            Log::error("tournaments() failed: " . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json([
                'success' => false,
                'message' => 'Server error while listing tournaments',
            ], 500);
        }
    }

    /**
     * Scoreboard data for a single tournament.
     * Supports forcing local data with ?local=1 to avoid hitting the online API.
     */
    public function scoreboardData(Request $request, $id)
    {
        $preferLocal = $request->has('local') ? $request->boolean('local') : env('KURASH_SCOREBOARD_LOCAL_FIRST', true);

        // If local schema cannot scope rows by tournament, local-first would mix tournaments.
        // Only force remote-first when the client did NOT explicitly request ?local=1 (scoreboard UI always sends local=1).
        if ($preferLocal && ! $this->hasTournamentIdColumn() && ! $this->hasTournamentNameColumn()) {
            $clientInsistsOnLocal = $request->has('local') && $request->boolean('local');
            if (! $clientInsistsOnLocal) {
                $preferLocal = false;
            }
        }

        $tournamentName = $this->resolveTournamentNameForRequest($request, (int) $id);

        if ($preferLocal) {
            return response()->json($this->buildLocalScoreboardPayload((int) $id, $tournamentName));
        }

        $result = $this->syncService->scoreboardData($id);
        if ($result['success']) {
            return response()->json(array_merge($result, ['source' => 'remote']));
        }

        // Fallback to local database if remote fails
        return response()->json($this->buildLocalScoreboardPayload((int) $id, $tournamentName));
    }

    /**
     * @return array{success: bool, source: string, tournament: array{id: int, name: string}, brackets: \Illuminate\Support\Collection}
     */
    protected function buildLocalScoreboardPayload(int $id, ?string $tournamentName): array
    {
        $makeBaseQuery = fn () => TournamentMatch::orderBy('match_number');

        $scopedBy = 'unscoped';
        $matches = collect();
        if ($this->hasTournamentIdColumn()) {
            $matches = $makeBaseQuery()->where('tournament_id', $id)->get();
            if ($matches->isNotEmpty()) {
                $scopedBy = 'tournament_id';
            }

            // Back-compat: older rows may not have tournament_id populated yet.
            if ($matches->isEmpty() && $tournamentName) {
                $matches = $makeBaseQuery()->where('tournament_name', $tournamentName)->get();
                if ($matches->isNotEmpty()) {
                    $scopedBy = 'tournament_name_fallback';
                }
            }
        } else {
            $query = $makeBaseQuery();
            $this->applyTournamentNameFilter($query, $tournamentName);
            $matches = $query->get();
            if ($tournamentName && $this->hasTournamentNameColumn()) {
                $scopedBy = 'tournament_name';
            }
        }

        $matches = $matches->map(function ($match) {
            $match->player_red_name = $match->player1_name;
            $match->player_blue_name = $match->player2_name;
            $match->player_red_team = $match->player1_team;
            $match->player_blue_team = $match->player2_team;
            $match->red_score = $match->result_details['score_p1']['k'] ?? $match->result_details['score_p1'] ?? 0;
            $match->blue_score = $match->result_details['score_p2']['k'] ?? $match->result_details['score_p2'] ?? 0;
            $match->setAttribute('round_number', $this->parseRoundNumberFromLabel($match->round));
            if ($match->category) {
                $match->setAttribute('bracket_name', $match->category);
            }

            return $match;
        });
        $brackets = $matches->groupBy(function ($m) {
            $age = $m->age_category ?: '';
            $gender = $m->gender ?: '';
            $cat = $m->category ?: '';

            return "{$age}|{$gender}|{$cat}";
        })->map(function ($items, $key) {
            $first = $items->first();
            $age = trim((string) ($first->age_category ?? ''));
            $gender = strtolower(trim((string) ($first->gender ?? '')));
            $cat = trim((string) ($first->category ?? ''));
            $genderLabel = '';
            if ($gender === 'male' || $gender === 'm') {
                $genderLabel = 'Male';
            } elseif ($gender === 'female' || $gender === 'f') {
                $genderLabel = 'Female';
            }
            $parts = [];
            foreach ([$age, $cat, $genderLabel] as $p) {
                $s = trim((string) $p);
                if ($s === '' || strcasecmp($s, 'N/A') === 0) {
                    continue;
                }
                $parts[] = $s;
            }
            $name = implode(' · ', $parts);
            if ($name === '') {
                $name = $cat !== '' ? $cat : 'Bracket';
            }
            $sorted = $items->sortBy('match_number')->values();

            return [
                'id' => $key,
                'name' => $name,
                'age_category' => $age,
                'gender' => $gender,
                'weight_category' => $cat,
                'matches' => $sorted,
            ];
        })->values();

        return [
            'success' => true,
            'source' => 'local',
            'scoped_by' => $scopedBy,
            'tournament' => [
                'id' => $id,
                'name' => $tournamentName ?: 'Tournament',
            ],
            'brackets' => $brackets,
        ];
    }

    protected function parseRoundNumberFromLabel(?string $round): ?int
    {
        if ($round === null || $round === '') {
            return null;
        }
        if (preg_match('/round\s*(\d+)/i', $round, $m)) {
            return (int) $m[1];
        }
        if (preg_match('/(\d+)/', $round, $m)) {
            return (int) $m[1];
        }

        return null;
    }

    /**
     * Prefer ?tournament_name= from the client (matches the selected tournament row), then the ID map.
     */
    protected function resolveTournamentNameForRequest(Request $request, int $id): ?string
    {
        $raw = $request->query('tournament_name');
        if (is_string($raw) && trim($raw) !== '') {
            return trim($raw);
        }

        return $this->lookupTournamentName($id);
    }

    /**
     * Check connection status to online server.
     */
    public function status()
    {
        try {
            if (request()->filled('admin_base')) {
                $this->syncService->setBaseUrl(request()->query('admin_base'));
            }
            $probe = $this->syncService->listTournaments();
            $online = !empty($probe['success']);
            return response()->json([
                'status' => $online ? 'ok' : 'offline',
                'message' => $probe['message'] ?? null,
                'runtime' => $this->syncService->resultSyncRuntimeIdentity(),
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'status' => 'offline',
                'message' => null,
                'runtime' => $this->syncService->resultSyncRuntimeIdentity(),
            ]);
        }
    }

    /**
     * Queue-prepared ring data from the online admin server.
     */
    public function ringQueue(Request $request, $id, $ring)
    {
        try {
            if ($request->filled('admin_base')) {
                $this->syncService->setBaseUrl($request->query('admin_base'));
            }

            $result = $this->syncService->ringQueue((int) $id, (int) $ring);

            return response()->json($result, !empty($result['success']) ? 200 : 500);
        } catch (\Throwable $e) {
            Log::error('ringQueue failed: '.$e->getMessage(), ['trace' => $e->getTraceAsString()]);

            return response()->json([
                'success' => false,
                'message' => 'Ring queue failed: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Queue-prepared fixed-size ring display batch from the online admin server.
     */
    public function ringDisplayBatch(Request $request, $id, $ring)
    {
        try {
            if ($request->filled('admin_base')) {
                $this->syncService->setBaseUrl($request->query('admin_base'));
            }

            $limit = (int) $request->query('limit', 5);
            $result = $this->syncService->ringDisplayBatch((int) $id, (int) $ring, $limit);

            return response()->json($result, !empty($result['success']) ? 200 : 500);
        } catch (\Throwable $e) {
            Log::error('ringDisplayBatch failed: '.$e->getMessage(), ['trace' => $e->getTraceAsString()]);

            return response()->json([
                'success' => false,
                'message' => 'Ring display batch failed: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Queue diagnostics for a ring from the online admin server.
     */
    public function ringQueueDiagnostics(Request $request, $id, $ring)
    {
        try {
            if ($request->filled('admin_base')) {
                $this->syncService->setBaseUrl($request->query('admin_base'));
            }

            $result = $this->syncService->ringQueueDiagnostics((int) $id, (int) $ring);

            return response()->json($result, !empty($result['success']) ? 200 : 500);
        } catch (\Throwable $e) {
            Log::error('ringQueueDiagnostics failed: '.$e->getMessage(), ['trace' => $e->getTraceAsString()]);

            return response()->json([
                'success' => false,
                'message' => 'Ring queue diagnostics failed: '.$e->getMessage(),
            ], 500);
        }
    }

    protected function lookupTournamentName(int $id): ?string
    {
        try {
            $mapPath = storage_path('app/tournament_map.json');
            if (file_exists($mapPath)) {
                $raw = file_get_contents($mapPath);
                $map = json_decode($raw, true);
                if (is_array($map)) {
                    if (isset($map[(string) $id])) {
                        return (string) $map[(string) $id];
                    }
                    // Keys may be stored as bare integers in JSON
                    if (isset($map[$id])) {
                        return (string) $map[$id];
                    }
                }
            }
        } catch (\Throwable $e) {}

        // No "latest tournament" fallback: it filtered the wrong rows when the id
        // was missing from the map (empty brackets / teams in packaged builds).
        return null;
    }

    protected function hasTournamentNameColumn(): bool
    {
        if (self::$hasTournamentNameColumn !== null) {
            return self::$hasTournamentNameColumn;
        }

        try {
            self::$hasTournamentNameColumn = Schema::hasColumn((new TournamentMatch)->getTable(), 'tournament_name');
        } catch (\Throwable $e) {
            self::$hasTournamentNameColumn = false;
        }

        return self::$hasTournamentNameColumn;
    }

    protected function hasTournamentIdColumn(): bool
    {
        if (self::$hasTournamentIdColumn !== null) {
            return self::$hasTournamentIdColumn;
        }

        try {
            self::$hasTournamentIdColumn = Schema::hasColumn((new TournamentMatch)->getTable(), 'tournament_id');
        } catch (\Throwable $e) {
            self::$hasTournamentIdColumn = false;
        }

        return self::$hasTournamentIdColumn;
    }

    protected function applyTournamentNameFilter($query, ?string $tournamentName): void
    {
        if (! $tournamentName || ! $this->hasTournamentNameColumn()) {
            return;
        }

        $query->where('tournament_name', $tournamentName);
    }

    /**
     * Sync all tournament data from online server.
     */
    public function syncAll(Request $request)
    {
        try {
            if ($request->filled('admin_base')) {
                $this->syncService->setBaseUrl($request->query('admin_base'));
            }
            $result = $this->syncService->syncAllTournaments();

            if ($result['success']) {
                return response()->json($result);
            }

            return response()->json($result, 500);
        } catch (\Throwable $e) {
            Log::error('syncAll failed: '.$e->getMessage(), ['trace' => $e->getTraceAsString()]);

            return response()->json([
                'success' => false,
                'message' => 'Sync failed: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Sync full tournament data from online server.
     */
    public function sync(Request $request)
    {
        $request->validate([
            'tournament_id' => 'required|integer',
        ]);
        try {
            if ($request->filled('admin_base')) {
                $this->syncService->setBaseUrl($request->query('admin_base'));
            }

            $result = $this->syncService->syncTournament($request->tournament_id);

            if ($result['success']) {
                return response()->json($result);
            }

            return response()->json($result, 500);
        } catch (\Throwable $e) {
            Log::error('sync tournament failed: '.$e->getMessage(), ['trace' => $e->getTraceAsString()]);

            return response()->json([
                'success' => false,
                'message' => 'Tournament sync failed: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update match details (Edit before confirm).
     */
    public function updateDetails(Request $request, $id)
    {
        // Try to find by local ID first, then by remote_id if not found
        $match = TournamentMatch::find($id);
        
        if (!$match) {
            $match = TournamentMatch::where('remote_id', $id)->firstOrFail();
        }
        
        $data = $request->validate([
            'match_number' => 'sometimes|integer',
            'player1_name' => 'sometimes|string',
            'player2_name' => 'sometimes|string',
            'category' => 'sometimes|string',
            'gender' => 'sometimes|string|in:male,female,N/A',
            'age_category' => 'sometimes|string',
        ]);

        $match->update($data);

        // Sync changes back to online server if possible
        if ($match->remote_id) {
            $this->syncService->updateMatchOnServer($match, $data);
        }

        return response()->json(['match' => $match, 'message' => 'Match details updated.']);
    }

    protected function extractRoundNumber($round): ?int
    {
        if (is_numeric($round)) return (int) $round;
        $s = is_string($round) ? $round : '';
        if (preg_match('/(\d+)/', $s, $m)) {
            return (int) $m[1];
        }
        return null;
    }

    protected function advanceWinnerLocally(TournamentMatch $match): void
    {
        if ($match->status !== 'completed' || !$match->winner) {
            return;
        }

        if ($match->next_match_id) {
            $nextMatch = TournamentMatch::where('remote_id', $match->next_match_id)->first();
            if ($nextMatch) {
                $winnerName = $match->winner === 'player1' ? $match->player1_name : $match->player2_name;
                $winnerTeam = $match->winner === 'player1' ? $match->player1_team : $match->player2_team;
                $winnerRemoteId = $match->winner === 'player1' ? $match->player1_remote_id : $match->player2_remote_id;

                if ($match->next_match_slot === 'player1') {
                    $nextMatch->update([
                        'player1_name' => $winnerName,
                        'player1_team' => $winnerTeam,
                        'player1_remote_id' => $winnerRemoteId,
                    ]);
                } else {
                    $nextMatch->update([
                        'player2_name' => $winnerName,
                        'player2_team' => $winnerTeam,
                        'player2_remote_id' => $winnerRemoteId,
                    ]);
                }

                Log::info("Advanced winner {$winnerName} to match {$nextMatch->id} (Remote ID: {$match->next_match_id})");
                return;
            }
        }

        $winnerName = $match->winner === 'player1' ? $match->player1_name : $match->player2_name;
        $winnerTeam = $match->winner === 'player1' ? $match->player1_team : $match->player2_team;
        $winnerRemoteId = $match->winner === 'player1' ? $match->player1_remote_id : $match->player2_remote_id;
        $roundNum = $this->extractRoundNumber($match->round);
        if ($roundNum === null) {
            return;
        }

        $bracketQuery = TournamentMatch::where('tournament_name', $match->tournament_name)
            ->where('category', $match->category);
        if ($match->gender) $bracketQuery->where('gender', $match->gender);
        if ($match->age_category) $bracketQuery->where('age_category', $match->age_category);
        $allBracket = $bracketQuery->get();
        $currentRound = $allBracket->filter(function ($m) use ($roundNum) {
            return $this->extractRoundNumber($m->round) === $roundNum;
        })->sortBy('match_number')->values();
        $index = $currentRound->search(function ($m) use ($match) {
            return (string)$m->id === (string)$match->id;
        });
        if ($index === false) {
            return;
        }

        $targetIndex = intdiv($index, 2);
        $nextRoundNum = $roundNum + 1;
        $nextRound = $allBracket->filter(function ($m) use ($nextRoundNum) {
            return $this->extractRoundNumber($m->round) === $nextRoundNum;
        })->sortBy('match_number')->values();
        if (!isset($nextRound[$targetIndex])) {
            return;
        }

        $next = $nextRound[$targetIndex];
        $slot = ($index % 2 === 0) ? 'player1' : 'player2';
        if ($slot === 'player1') {
            $next->update([
                'player1_name' => $winnerName,
                'player1_team' => $winnerTeam,
                'player1_remote_id' => $winnerRemoteId,
            ]);
        } else {
            $next->update([
                'player2_name' => $winnerName,
                'player2_team' => $winnerTeam,
                'player2_remote_id' => $winnerRemoteId,
            ]);
        }

        Log::info("Advanced winner {$winnerName} to local match {$next->id} using fallback progression");
    }

    /**
     * Update match result locally and try to sync online.
     */
    public function update(Request $request, $id)
    {
        // Try to find by local ID first, then by remote_id if not found
        $match = TournamentMatch::find($id);
        
        if (!$match) {
            $match = TournamentMatch::where('remote_id', $id)->firstOrFail();
        }

        $data = $request->validate([
            'status' => 'required|in:pending,current,completed',
            'winner' => 'nullable|string', // 'player1' or 'player2'
            'result_details' => 'nullable|array', // { score_p1: 10, score_p2: 0, time: "2:30" }
        ]);

        DB::beginTransaction();
        try {
            $match->update([
                'status' => $data['status'],
                'winner' => $data['winner'] ?? null,
                'result_details' => $data['result_details'] ?? null,
                'is_synced' => false, // Mark as needing sync
            ]);

            $this->advanceWinnerLocally($match);
            
            DB::commit();

            // Optionally sync online if enabled
            if ($match->status === 'completed' && env('KURASH_SYNC_ENABLED', false)) {
                $syncResult = $this->syncService->sendMatchResult($match);
                return response()->json([
                    'match' => $match,
                    'sync_status' => $syncResult['success'] ? 'synced' : 'pending_offline',
                    'message' => $syncResult['message']
                ]);
            }

            return response()->json([
                'match' => $match, 
                'sync_status' => env('KURASH_SYNC_ENABLED', false) ? 'pending_offline' : 'disabled',
                'message' => 'Match updated locally.'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Failed to update match {$id}: " . $e->getMessage());
            return response()->json(['message' => 'Failed to update match locally.'], 500);
        }
    }

    /**
     * Submit match result with winner_id and scores.
     */
    public function postResult(Request $request, $id)
    {
        // Try to find by local ID first, then by remote_id if not found
        $match = TournamentMatch::find($id);
        if (!$match) {
            $match = TournamentMatch::where('remote_id', $id)->firstOrFail();
        }

        $adminBase = trim((string) $request->query('admin_base', $request->input('admin_base', '')));
        $traceId = trim((string) $request->header('X-Kurash-Trace-Id', ''));
        if ($adminBase !== '') {
            $this->syncService->setBaseUrl($adminBase);
        }

        Log::info('[result-sync] controller.relay.request', [
            'trace_id' => $traceId !== '' ? $traceId : null,
            'route_match_id' => $id,
            'local_match_id' => $match->id,
            'remote_match_id' => $match->remote_id,
            'admin_base' => $adminBase !== '' ? $adminBase : null,
            'runtime' => $this->syncService->resultSyncRuntimeIdentity(),
            'body' => $request->only([
                'winner_id',
                'winner_side',
                'red_score',
                'blue_score',
                'tournament_id',
                'ring',
                'ring_number',
                'match_id',
                'round_number',
                'match_number',
                'player_one_name',
                'player_two_name',
                'weight_category',
            ]),
        ]);

        try {
            $data = $request->validate([
                'winner_id' => 'nullable|integer',
                'winner_side' => 'nullable|in:player1,player2',
                'red_score' => 'required|integer|min:0',
                'blue_score' => 'required|integer|min:0',
                'tournament_id' => 'nullable|integer',
                'ring' => 'nullable|integer',
                'ring_number' => 'nullable|integer',
                'match_id' => 'nullable|integer',
                'round_number' => 'nullable|integer',
                'match_number' => 'nullable|integer',
                'player_one_name' => 'nullable|string',
                'player_two_name' => 'nullable|string',
                'weight_category' => 'nullable|string',
            ]);
        } catch (ValidationException $e) {
            Log::warning('[result-sync] controller.relay.validation_failed', [
                'trace_id' => $traceId !== '' ? $traceId : null,
                'route_match_id' => $id,
                'local_match_id' => $match->id,
                'remote_match_id' => $match->remote_id,
                'admin_base' => $adminBase !== '' ? $adminBase : null,
                'runtime' => $this->syncService->resultSyncRuntimeIdentity(),
                'errors' => $e->errors(),
                'body' => $request->only([
                    'winner_id',
                    'winner_side',
                    'red_score',
                    'blue_score',
                    'tournament_id',
                    'ring',
                    'ring_number',
                    'match_id',
                    'round_number',
                    'match_number',
                    'player_one_name',
                    'player_two_name',
                    'weight_category',
                ]),
            ]);
            throw $e;
        }

        // Resolve the local winner from the authoritative remote player ID first.
        $winner = null;
        if (!empty($data['winner_id'])) {
            if ($match->player1_remote_id && (int) $data['winner_id'] === (int) $match->player1_remote_id) {
                $winner = 'player1';
            }
            if ($match->player2_remote_id && (int) $data['winner_id'] === (int) $match->player2_remote_id) {
                $winner = 'player2';
            }
        }
        if ($winner === null && !empty($data['winner_side'])) {
            $winner = $data['winner_side'];
        }

        DB::beginTransaction();
        try {
            $match->update([
                'status' => 'completed',
                'winner' => $winner,
                'result_details' => [
                    'score_p1' => $data['red_score'],
                    'score_p2' => $data['blue_score'],
                ],
                'is_synced' => false,
            ]);

            $this->advanceWinnerLocally($match);

            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Failed to record result for match {$id}: " . $e->getMessage());
            return response()->json(['message' => 'Failed to record result locally.'], 500);
        }

        $shouldAttemptSync = env('KURASH_SYNC_ENABLED', false) || $adminBase !== '';
        if ($shouldAttemptSync) {
            $syncContext = array_filter([
                'trace_id' => $traceId !== '' ? $traceId : null,
                'tournament_id' => $data['tournament_id'] ?? null,
                'ring' => $data['ring'] ?? null,
                'ring_number' => $data['ring_number'] ?? null,
                'match_id' => $data['match_id'] ?? null,
                'winner_id' => $data['winner_id'] ?? null,
                'round_number' => $data['round_number'] ?? null,
                'match_number' => $data['match_number'] ?? null,
                'player_one_name' => $data['player_one_name'] ?? null,
                'player_two_name' => $data['player_two_name'] ?? null,
                'weight_category' => $data['weight_category'] ?? null,
            ], function ($value) {
                return $value !== null && $value !== '';
            });

            $syncResult = $this->syncService->sendMatchResult($match, $syncContext);
            Log::info('[result-sync] controller.relay.response', [
                'trace_id' => $traceId !== '' ? $traceId : null,
                'route_match_id' => $id,
                'local_match_id' => $match->id,
                'remote_match_id' => $match->remote_id,
                'sync_status' => $syncResult['success'] ? 'synced' : 'pending_offline',
                'message' => $syncResult['message'],
                'sync_failure_class' => $syncResult['sync_failure_class'] ?? null,
                'reject_reason' => $syncResult['reject_reason'] ?? null,
                'result_trace_id' => $syncResult['result_trace_id'] ?? null,
                'runtime' => $this->syncService->resultSyncRuntimeIdentity(),
                'sync_context' => $syncContext,
            ]);
            return response()->json([
                'match' => $match,
                'sync_status' => $syncResult['success'] ? 'synced' : 'pending_offline',
                'message' => $syncResult['message'],
                'sync_failure_class' => $syncResult['sync_failure_class'] ?? null,
                'reject_reason' => $syncResult['reject_reason'] ?? null,
                'result_trace_id' => $syncResult['result_trace_id'] ?? null,
            ]);
        }
        return response()->json([
            'match' => $match,
            'sync_status' => 'disabled',
            'message' => 'Result saved locally.',
            'sync_failure_class' => null,
            'reject_reason' => null,
            'result_trace_id' => null,
        ]);
    }

    /**
     * Clear all matches from the local schedule.
     */
    public function destroyAll()
    {
        TournamentMatch::truncate();

        return response()->json([
            'success' => true,
            'message' => 'All matches removed from schedule.'
        ]);
    }

    /**
     * Delete a match from the schedule.
     */
    public function destroy($id)
    {
        // Try to find by local ID first, then by remote_id if not found
        $match = TournamentMatch::find($id);
        
        if (!$match) {
            $match = TournamentMatch::where('remote_id', $id)->firstOrFail();
        }
        
        // We only delete it locally. If they sync again, it might come back 
        // unless they delete it on the remote server too.
        $match->delete();

        return response()->json([
            'success' => true,
            'message' => 'Match removed from schedule.'
        ]);
    }

    /**
     * Manually trigger sync for pending results.
     */
    public function syncPending()
    {
        $result = $this->syncService->syncPendingResults();

        return response()->json($result);
    }
    
    /**
     * Manual JSON Import (Backup).
     */
    public function import(Request $request)
    {
        // ... (Logic from previous turn if needed, or just rely on Sync Service)
        // Implementation for manual JSON paste if internet is totally dead
        $input = $request->all();
        $matches = $input['matches'] ?? $input;

        if (!is_array($matches)) {
            return response()->json(['message' => 'Invalid data format'], 422);
        }

        DB::transaction(function () use ($matches) {
             foreach ($matches as $matchData) {
                TournamentMatch::updateOrCreate(
                    ['remote_id' => $matchData['id'] ?? null],
                    [
                        'match_number' => $matchData['match_number'] ?? 0,
                        'player1_name' => $matchData['player1_name'] ?? 'Unknown',
                        'player2_name' => $matchData['player2_name'] ?? 'Unknown',
                        // ... mapping fields
                    ]
                );
             }
        });
        
        return response()->json(['message' => 'Matches imported manually.']);
    }

    public function listTeams(Request $request)
    {
        $query = TournamentMatch::query();
        $name = null;
        if ($request->filled('tournament_name')) {
            $name = trim((string) $request->query('tournament_name'));
        } elseif ($request->filled('tournament_id')) {
            $name = $this->lookupTournamentName((int) $request->query('tournament_id'));
        }
        if ($name && $this->hasTournamentNameColumn()) {
            $query->where('tournament_name', $name);
        }
        $teams = $query->get(['player1_team', 'player2_team'])->flatMap(function ($m) {
            return [$m->player1_team, $m->player2_team];
        })->filter(function ($t) {
            return is_string($t) && trim($t) !== '' && strtolower(trim($t)) !== 'tbd';
        })->unique()->values()->all();
        return response()->json(['teams' => $teams]);
    }

    public function uploadTeamLogo(Request $request)
    {
        try {
            // Be lenient about validation to always return JSON even without proper headers
            $team = (string) $request->input('team', '');
            if ($team === '') {
                return response()->json(['error' => 'Validation failed', 'message' => 'Team is required'], 422);
            }
            if (!$request->hasFile('file')) {
                return response()->json(['error' => 'No file received', 'message' => 'Check upload_max_filesize/post_max_size'], 400);
            }
            $file = $request->file('file');
            if (!$file || !$file->isValid()) {
                return response()->json(['error' => 'Invalid upload', 'message' => 'Uploaded file is invalid'], 422);
            }
            // Extension allow-list
            $ext = strtolower($file->getClientOriginalExtension() ?: $file->extension());
            $allowed = ['png','jpg','jpeg','webp','svg'];
            if (!in_array($ext, $allowed, true)) {
                return response()->json(['error' => 'Unsupported file type'], 415);
            }
            $slug = $this->slugify($team);
            $filename = $slug . '.' . $ext;
            // Primary location: public/images
            $publicDir = public_path('images');
            $savedPath = null;
            if (@is_dir($publicDir) || @mkdir($publicDir, 0775, true)) {
                $targetPublic = rtrim($publicDir, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . $filename;
                try {
                    $file->move($publicDir, $filename);
                    if (file_exists($targetPublic)) {
                        $savedPath = '/images/' . $filename;
                    }
                } catch (\Throwable $e) {
                    // fall through to storage fallback
                }
            }
            // Fallback location: storage/app/club-logos + route /team-logos/{filename}
            if ($savedPath === null) {
                $storageDir = storage_path('app/club-logos');
                if (!@is_dir($storageDir) && !@mkdir($storageDir, 0775, true)) {
                    return response()->json(['error' => 'Failed to create images directory'], 500);
                }
                $targetStorage = rtrim($storageDir, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . $filename;
                try {
                    // move() requires a directory; to avoid cross-device issues, use copy()
                    @copy($file->getRealPath(), $targetStorage);
                    if (!file_exists($targetStorage)) {
                        return response()->json(['error' => 'Failed to save file'], 500);
                    }
                } catch (\Throwable $e) {
                    return response()->json(['error' => 'Failed to save file', 'message' => $e->getMessage()], 500);
                }
                $savedPath = '/team-logos/' . $filename;
            }
            return response()->json(['filename' => $filename, 'team' => $team, 'path' => $savedPath]);
        } catch (\Throwable $e) {
            return response()->json(['error' => 'Upload failed', 'message' => $e->getMessage()], 500);
        }
    }

    public function getTeamLogo($filename)
    {
        $filename = basename($filename);
        $public = public_path('images' . DIRECTORY_SEPARATOR . $filename);
        $storage = storage_path('app' . DIRECTORY_SEPARATOR . 'club-logos' . DIRECTORY_SEPARATOR . $filename);
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

    protected function slugify($text)
    {
        $t = (string) $text;
        // Replace non letter/digit by -
        $t = preg_replace('~[^\pL\d]+~u', '-', $t);
        // Best-effort transliteration if iconv exists
        if (function_exists('iconv')) {
            $converted = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $t);
            if ($converted !== false && $converted !== null) {
                $t = $converted;
            }
        }
        // Remove unwanted characters
        $t = preg_replace('~[^-\w]+~', '', $t);
        $t = trim($t, '-');
        $t = preg_replace('~-+~', '-', $t);
        $t = strtolower($t);
        if (empty($t)) { return 'logo'; }
        return $t;
    }
}
