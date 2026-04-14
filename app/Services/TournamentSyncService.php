<?php

namespace App\Services;

use App\Models\TournamentMatch;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Throwable;

class TournamentSyncService
{
    protected $baseUrl;
    protected $apiKey;
    protected static ?bool $hasRingNumberColumn = null;
    protected static ?bool $hasTournamentIdColumn = null;

    public function __construct()
    {
        $this->setBaseUrl(
            env('KURASH_REMOTE_API_BASE', env('KURASH_API_BASE', env('API_BASE_URL', '')))
        );
        $this->apiKey = env('KURASH_API_KEY', env('API_KEY', 'kurash-scoreboard'));
    }

    public function setBaseUrl(string $base = null): void
    {
        $this->baseUrl = $this->normalizeBaseUrl($base);
    }

    protected function normalizeBaseUrl(?string $base): string
    {
        $base = trim((string) $base);
        if ($base === '') {
            return '';
        }

        $base = rtrim($base, '/');
        if (!preg_match('/^https?:\/\//i', $base)) {
            $base = 'http://' . ltrim($base, '/');
        }
        $base = preg_replace('#(?:/api)+$#i', '', $base) ?: $base;
        $base .= '/api';

        return rtrim($base, '/');
    }

    protected function client()
    {
        $headers = [];
        if (!empty($this->apiKey)) {
            $headers['X-API-KEY'] = $this->apiKey;
        }
        return Http::withHeaders($headers)->acceptJson()->timeout(10);
    }

    protected function isLikelyDatabaseFailure(Throwable $e): bool
    {
        if ($e instanceof ConnectionException) {
            return false;
        }

        $message = strtolower(trim($e->getMessage()));
        if ($message === '') {
            return false;
        }

        return str_contains($message, 'sqlstate')
            || str_contains($message, 'connection:')
            || str_contains($message, 'database')
            || str_contains($message, 'no connection could be made')
            || str_contains($message, 'actively refused');
    }

    protected function syncTransportFailure(string $context, Throwable $e): array
    {
        if ($e instanceof ConnectionException) {
            Log::error("Connection error during {$context}: " . $e->getMessage());
            return ['success' => false, 'message' => 'Offline mode: Cannot connect to server.'];
        }

        if ($this->isLikelyDatabaseFailure($e)) {
            Log::error("Local database error during {$context}: " . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return ['success' => false, 'message' => 'Local database unavailable during sync: ' . $e->getMessage()];
        }

        Log::error("Unexpected error during {$context}: " . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
        return ['success' => false, 'message' => 'Unexpected sync error: ' . $e->getMessage()];
    }

    protected function hasRingNumberColumn(): bool
    {
        if (self::$hasRingNumberColumn === null) {
            try {
                self::$hasRingNumberColumn = Schema::hasColumn('matches', 'ring_number');
            } catch (\Throwable $e) {
                self::$hasRingNumberColumn = false;
            }
        }

        return self::$hasRingNumberColumn;
    }

    protected function hasTournamentIdColumn(): bool
    {
        if (self::$hasTournamentIdColumn === null) {
            try {
                self::$hasTournamentIdColumn = Schema::hasColumn('matches', 'tournament_id');
            } catch (\Throwable $e) {
                self::$hasTournamentIdColumn = false;
            }
        }

        return self::$hasTournamentIdColumn;
    }

    /**
     * Best-effort: keep local DB schema compatible with multi-ring tournaments.
     * Packaged builds may ship with an older sqlite DB that hasn't run migrations.
     */
    public function ensureRingNumberColumn(): void
    {
        if ($this->hasRingNumberColumn()) {
            return;
        }

        try {
            Schema::table('matches', function (Blueprint $table) {
                if (!Schema::hasColumn('matches', 'ring_number')) {
                    $table->unsignedInteger('ring_number')->nullable();
                }
            });

            // Re-check and refresh cached value.
            self::$hasRingNumberColumn = null;
            $this->hasRingNumberColumn();
        } catch (\Throwable $e) {
            // Keep the app working even if schema updates aren't permitted.
            self::$hasRingNumberColumn = null;
            Log::warning('Unable to add ring_number column to matches table: '.$e->getMessage());
        }
    }

    public function ensureTournamentIdColumn(): void
    {
        if ($this->hasTournamentIdColumn()) {
            return;
        }

        try {
            Schema::table('matches', function (Blueprint $table) {
                if (!Schema::hasColumn('matches', 'tournament_id')) {
                    $table->unsignedBigInteger('tournament_id')->nullable();
                }
            });

            self::$hasTournamentIdColumn = null;
            $this->hasTournamentIdColumn();
        } catch (\Throwable $e) {
            self::$hasTournamentIdColumn = null;
            Log::warning('Unable to add tournament_id column to matches table: '.$e->getMessage());
        }
    }

    protected function url(string $path)
    {
        if ($this->baseUrl === '') {
            throw new \RuntimeException('Remote admin API base is not configured.');
        }

        return $this->baseUrl . '/' . ltrim($path, '/');
    }
    /**
     * List tournaments from the online server.
     */
    public function listTournaments()
    {
        try {
            $response = $this->client()->get($this->url('tournaments'));
            if (!$response->successful()) {
                return [
                    'success' => false,
                    'message' => "Online system error (Status: {$response->status()})"
                ];
            }
            $ct = strtolower((string) $response->header('Content-Type'));
            if (str_contains($ct, 'text/html')) {
                Log::error("Remote /api/tournaments returned HTML (likely portal or login page).");
                return ['success' => false, 'message' => 'Admin API returned HTML instead of JSON'];
            }
            $body = $response->body();
            if (is_string($body) && str_starts_with(ltrim($body), '<!DOCTYPE')) {
                Log::error("Remote /api/tournaments returned HTML document.");
                return ['success' => false, 'message' => 'Admin API returned HTML instead of JSON'];
            }
            $data = $response->json();
            $tournaments = [];
            $extract = null;
            if (is_array($data) && (function_exists('array_is_list') ? array_is_list($data) : $this->isListArray($data))) {
                $extract = $data;
            } elseif (isset($data['tournaments']) && is_array($data['tournaments'])) {
                $extract = $data['tournaments'];
            } elseif (isset($data['data']) && is_array($data['data'])) {
                $extract = $data['data'];
            } elseif (isset($data['items']) && is_array($data['items'])) {
                $extract = $data['items'];
            } else {
                if (is_array($data)) {
                    $values = array_values($data);
                    if (!empty($values) && is_array($values[0])) {
                        $extract = $values;
                    }
                }
            }
            if (empty($extract)) {
                try { Log::warning("Remote /api/tournaments returned empty list. Raw body: " . $response->body()); } catch (\Throwable $e) {}
            }
            $tournaments = collect($extract ?: [])->map(function ($t) {
                $ringRaw = $t['ring_count'] ?? $t['rings'] ?? $t['ringCount'] ?? $t['ring_count_total']
                    ?? $t['mat_count'] ?? $t['matCount'] ?? $t['mats'] ?? $t['mat'] ?? $t['ring'] ?? null;
                $ringCount = null;
                if (is_array($ringRaw)) {
                    $ringCount = count($ringRaw);
                } elseif (is_numeric($ringRaw)) {
                    $ringCount = (int) $ringRaw;
                } elseif (is_string($ringRaw) && preg_match('/(\d+)/', $ringRaw, $m)) {
                    $ringCount = (int) $m[1];
                }
                if (is_int($ringCount) && $ringCount <= 0) {
                    $ringCount = null;
                }

                return [
                    'id' => $t['id'] ?? ($t['tournament_id'] ?? null),
                    'name' => $t['name'] ?? ($t['title'] ?? 'Tournament'),
                    'ring_count' => $ringCount,
                ];
            })->filter(fn($t) => $t['id'] !== null)->values()->all();
            return [
                'success' => true,
                'tournaments' => $tournaments,
            ];
        } catch (\Exception $e) {
            Log::error("Connection error during listTournaments: " . $e->getMessage());
            $message = str_contains(strtolower($e->getMessage()), 'not configured')
                ? 'Admin API base URL is not configured.'
                : 'Offline mode: Cannot connect to server.';
            return ['success' => false, 'message' => $message];
        }
    }

    protected function isListArray(array $array): bool
    {
        $expectedKey = 0;
        foreach ($array as $key => $_) {
            if ($key !== $expectedKey) {
                return false;
            }
            $expectedKey++;
        }
        return true;
    }

    /**
     * Check if online API is reachable.
     */
    public function isOnline()
    {
        // Try explicit health endpoint
        try {
            $response = $this->client()->get($this->url('health'));
            if ($response->successful()) {
                return true;
            }
        } catch (\Exception $e) {}

        // Fallback: try a lightweight data endpoint
        try {
            $response = $this->client()->get($this->url('tournaments'));
            if ($response->status() >= 200 && $response->status() <= 599) {
                return true;
            }
        } catch (\Exception $e) {}

        // Final fallback: ping the base URL (may return 404 if no route, still indicates reachability)
        try {
            $response = $this->client()->get($this->baseUrl);
            return true;
        } catch (\Exception $e) {
            return false;
        }
    }

    /**
     * Fetch all tournament data and sync to local DB.
     */
    public function syncAllTournaments()
    {
        try {
            $this->ensureRingNumberColumn();
            $this->ensureTournamentIdColumn();
            // Try bulk endpoint first
            $response = $this->client()->get($this->url('tournaments/sync-all'));
            if ($response->successful()) {
                $data = $response->json();
                if ($data && isset($data['tournaments'])) {
                    $tournaments = $data['tournaments'];
                    $totalMatches = 0;
                    $syncedTournaments = [];

                    try {
                        DB::beginTransaction();
                        foreach ($tournaments as $tournament) {
                            $tournamentId = $tournament['id'] ?? ($tournament['tournament_id'] ?? null);
                            $tournamentName = $tournament['name'] ?? 'Tournament';
                            $brackets = $tournament['brackets'] ?? [];
                            $syncedBrackets = [];
                            foreach ($brackets as $bracket) {
                                // Kurash remote often provides both `name` (ex: "Male - Kids 4-7") and
                                // `weight_category` (ex: "-19"). We store weight in `category` and
                                // save the bracket age group separately.
                                $bracketName = $bracket['name'] ?? null;
                                $categoryName = $bracket['weight_category'] ?? $bracket['weightCategory'] ?? ($bracket['category'] ?? null) ?? ($bracketName ?? 'Unknown');
                                $gender = $bracket['gender'] ?? null;
                                if (!$gender) {
                                    $gender = $this->detectGender($bracketName ?? $categoryName);
                                }
                                $ageCategory = $this->normalizeAgeCategoryLabel(
                                    $bracket['age_category'] ?? $bracket['ageCategory'] ?? $bracket['age'] ?? $bracket['division'] ?? $bracket['classification'] ?? null
                                ) ?? $this->extractAgeCategoryFromName($bracketName);
                                $matches = $bracket['matches'] ?? [];
                                $syncedMatches = [];
                                foreach ($matches as $matchData) {
                                    $savedMatch = $this->saveMatch($matchData, $tournamentId, $tournamentName, $categoryName, collect([]), $gender, $ageCategory, $bracketName);
                                    // Map local fields for UI
                                    $matchData['local_id'] = $savedMatch->id;
                                    $matchData['player_red_name'] = $savedMatch->player1_name;
                                    $matchData['player_blue_name'] = $savedMatch->player2_name;
                                    $matchData['player_red_team'] = $savedMatch->player1_team;
                                    $matchData['player_blue_team'] = $savedMatch->player2_team;
                                    $matchData['gender'] = $savedMatch->gender;
                                    $matchData['bracket_name'] = $categoryName;
                                    $syncedMatches[] = $matchData;
                                    $totalMatches++;
                                }
                                $bracket['matches'] = $syncedMatches;
                                $syncedBrackets[] = $bracket;
                            }
                            $tournament['brackets'] = $syncedBrackets;
                            $syncedTournaments[] = $tournament;
                        }
                        DB::commit();
                        // Keep ID → name map in sync so local scoreboard / teams filter correctly
                        try {
                            $mapPath = storage_path('app/tournament_map.json');
                            $map = [];
                            if (file_exists($mapPath)) {
                                $raw = file_get_contents($mapPath);
                                $map = json_decode($raw, true) ?: [];
                            }
                            foreach ($tournaments as $t) {
                                $tid = $t['id'] ?? ($t['tournament_id'] ?? null);
                                $nm = $t['name'] ?? null;
                                if ($tid !== null && $nm) {
                                    $map[(string) $tid] = (string) $nm;
                                }
                            }
                            @file_put_contents($mapPath, json_encode($map, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
                        } catch (\Throwable $e) {
                            Log::warning('Unable to persist tournament map after sync-all: '.$e->getMessage());
                        }
                        return [
                            'success' => true, 
                            'message' => 'All tournaments synced successfully.', 
                            'tournaments' => $syncedTournaments,
                            'count' => $totalMatches
                        ];
                    } catch (\Exception $e) {
                        try { DB::rollBack(); } catch (\Throwable) {}
                        Log::error("Database sync error (syncAll): " . $e->getMessage());
                        return ['success' => false, 'message' => 'Database error during sync: ' . $e->getMessage()];
                    }
                }
                // If structure invalid, fall through to fallback path
                Log::error("Remote sync-all structure invalid; falling back to per-tournament sync.");
            }

            // Fallback path: get list of tournaments and sync individually
            $listRes = $this->client()->get($this->url('tournaments'));
            if (!$listRes->successful()) {
                return [
                    'success' => false,
                    'message' => "Online system error (Status: {$listRes->status()})"
                ];
            }
            $listData = $listRes->json();
            $ids = [];
            if (is_array($listData) && (function_exists('array_is_list') ? array_is_list($listData) : $this->isListArray($listData))) {
                $ids = array_values(array_filter(array_map(function ($t) {
                    return $t['id'] ?? ($t['tournament_id'] ?? null);
                }, $listData)));
            } elseif (isset($listData['tournaments']) && is_array($listData['tournaments'])) {
                $ids = array_values(array_filter(array_map(function ($t) {
                    return $t['id'] ?? ($t['tournament_id'] ?? null);
                }, $listData['tournaments'])));
            }

            $syncedTournaments = [];
            $totalMatches = 0;
            foreach ($ids as $tid) {
                $res = $this->syncTournament($tid);
                if (!empty($res['success'])) {
                    $syncedTournaments[] = $res['tournament'];
                    $totalMatches += $res['count'] ?? 0;
                }
            }
            return [
                'success' => true,
                'message' => 'All tournaments synced via fallback.',
                'tournaments' => $syncedTournaments,
                'count' => $totalMatches
            ];

        } catch (\Throwable $e) {
            return $this->syncTransportFailure('syncAll', $e);
        }
    }

    /**
     * Fetch full tournament data and sync to local DB.
     */
    public function syncTournament($tournamentId)
    {
        try {
            $this->ensureRingNumberColumn();
            $this->ensureTournamentIdColumn();
            $response = $this->client()->get($this->url("tournaments/{$tournamentId}/full-data"));

            if (!$response->successful()) {
                if ($response->status() === 404) {
                    $fallback = $this->client()->get($this->url("tournaments/{$tournamentId}/scoreboard-data"));
                    if (!$fallback->successful()) {
                        return [
                            'success' => false, 
                            'message' => "Online system error (Status: {$fallback->status()})"
                        ];
                    }
                    $data = $fallback->json();
                    $tournamentData = $data['tournament'] ?? [];
                    $tournamentName = ($tournamentData['name'] ?? null) ?? 'Tournament';
                    $brackets = $data['brackets'] ?? [];
                    try {
                        DB::beginTransaction();
                        $hierarchicalBrackets = [];
                        $totalMatches = 0;
                        foreach ($brackets as $bracket) {
                            $bracketName = $bracket['name'] ?? null;
                            $categoryName = $bracket['weight_category'] ?? $bracket['weightCategory'] ?? ($bracket['category'] ?? null) ?? ($bracketName ?? 'Unknown');
                            $gender = $bracket['gender'] ?? null;
                            if (!$gender) {
                                $gender = $this->detectGender($bracketName ?? $categoryName);
                            }
                            $ageCategory = $this->normalizeAgeCategoryLabel(
                                $bracket['age_category'] ?? $bracket['ageCategory'] ?? $bracket['age'] ?? $bracket['division'] ?? $bracket['classification'] ?? null
                            ) ?? $this->extractAgeCategoryFromName($bracketName);
                            $bracketMatches = [];
                            foreach (($bracket['matches'] ?? []) as $matchData) {
                                $savedMatch = $this->saveMatch($matchData, $tournamentId, $tournamentName, $categoryName, collect([]), $gender, $ageCategory, $bracketName);
                                $matchData['local_id'] = $savedMatch->id;
                                $matchData['player_red_name'] = $savedMatch->player1_name;
                                $matchData['player_blue_name'] = $savedMatch->player2_name;
                                $matchData['player_red_team'] = $savedMatch->player1_team;
                                $matchData['player_blue_team'] = $savedMatch->player2_team;
                                $matchData['gender'] = $savedMatch->gender;
                                $matchData['bracket_name'] = $categoryName;
                                $bracketMatches[] = $matchData;
                                $totalMatches++;
                            }
                            $hierarchicalBrackets[] = array_merge($bracket, ['matches' => $bracketMatches]);
                        }
                        DB::commit();
                        // Persist local mapping of tournament ID -> name for offline usage
                        try {
                            $mapPath = storage_path('app/tournament_map.json');
                            $map = [];
                            if (file_exists($mapPath)) {
                                $raw = file_get_contents($mapPath);
                                $map = json_decode($raw, true) ?: [];
                            }
                            $map[(string)$tournamentId] = $tournamentName;
                            @file_put_contents($mapPath, json_encode($map, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
                        } catch (\Throwable $e) {
                            Log::warning("Unable to persist tournament map (fallback): " . $e->getMessage());
                        }
                        return [
                            'success' => true, 
                            'message' => "Tournament '{$tournamentName}' synced via fallback with {$totalMatches} matches.",
                            'tournament' => [
                                'id' => $tournamentData['id'] ?? $tournamentId,
                                'name' => $tournamentName,
                                'description' => $tournamentData['description'] ?? '',
                                'brackets' => $hierarchicalBrackets
                            ],
                            'count' => $totalMatches
                        ];
                    } catch (\Exception $e) {
                        try { DB::rollBack(); } catch (\Throwable) {}
                        return ['success' => false, 'message' => 'Database error during fallback sync: ' . $e->getMessage()];
                    }
                } else {
                    $remoteMessage = 'Unknown remote error';
                    try {
                        $errorData = $response->json();
                        if (is_array($errorData)) {
                            $remoteMessage = $errorData['error'] ?? $errorData['message'] ?? 'Unknown remote error';
                        } else {
                            $remoteMessage = $response->body() ?: 'Empty response body';
                        }
                    } catch (\Exception $e) {
                        $remoteMessage = "Remote server error (not JSON). Status: " . $response->status();
                    }
                    return [
                        'success' => false, 
                        'message' => "Online system error (Status: {$response->status()}): {$remoteMessage}"
                    ];
                }
            } // <-- close if (!$response->successful())

            $data = $response->json();
            if (!$data) {
                Log::error("Remote server returned successful status but empty or invalid JSON: " . $response->body());
                return ['success' => false, 'message' => 'Invalid data format received from online server.'];
            }
            
            // The single tournament data might be at the root or under 'tournament'
            $tournamentData = $data['tournament'] ?? $data;
            
            // Log the structure for debugging
            Log::info("Syncing tournament: " . ($tournamentData['name'] ?? 'Unknown'));

            $matches = $data['matches'] ?? $tournamentData['matches'] ?? [];
            $brackets = $data['brackets'] ?? $tournamentData['brackets'] ?? [];
            $players = collect($data['players'] ?? $tournamentData['players'] ?? []);
            $categories = collect($data['categories'] ?? $tournamentData['categories'] ?? []);
            $tournamentName = ($tournamentData['name'] ?? null) ?? 'Tournament';

            try {
                DB::beginTransaction();
                if (empty($matches) && empty($brackets)) {
                    Log::warning("Tournament sync received no matches or brackets for ID: {$tournamentId}");
                }

                // Final hierarchical data to return to frontend
                $hierarchicalBrackets = [];
                $totalMatches = 0;

                // If brackets are provided, iterate through them
                if (!empty($brackets)) {
                    foreach ($brackets as $bracket) {
                        $bracketName = $bracket['name'] ?? null;
                        $categoryName = $bracket['weight_category'] ?? $bracket['weightCategory'] ?? ($bracket['category'] ?? null) ?? ($bracketName ?? 'Unknown');
                        $gender = $bracket['gender'] ?? null;
                        if (!$gender) {
                            $gender = $this->detectGender($bracketName ?? $categoryName);
                        }
                        $ageCategory = $this->normalizeAgeCategoryLabel(
                            $bracket['age_category'] ?? $bracket['ageCategory'] ?? $bracket['age'] ?? $bracket['division'] ?? $bracket['classification'] ?? null
                        ) ?? $this->extractAgeCategoryFromName($bracketName);
                        
                        // If bracket name contains gender info, infer it
                        if (!$gender) {
                            $gender = $this->detectGender($categoryName);
                        }

                        $bracketMatches = [];
                        $matchesInThisBracket = $bracket['matches'] ?? [];
                        foreach ($matchesInThisBracket as $matchData) {
                            $savedMatch = $this->saveMatch($matchData, $tournamentId, $tournamentName, $categoryName, $players, $gender, $ageCategory, $bracketName);
                            
                            // Map local ID to the match data for frontend use
                            $matchData['local_id'] = $savedMatch->id;
                            
                            // Ensure display fields are mapped for frontend
                            $matchData['player_red_name'] = $savedMatch->player1_name;
                            $matchData['player_blue_name'] = $savedMatch->player2_name;
                            $matchData['player_red_team'] = $savedMatch->player1_team;
                            $matchData['player_blue_team'] = $savedMatch->player2_team;
                            $matchData['gender'] = $savedMatch->gender;
                            $matchData['bracket_name'] = $categoryName;
                            
                            $bracketMatches[] = $matchData;
                            $totalMatches++;
                        }

                        $hierarchicalBrackets[] = array_merge($bracket, ['matches' => $bracketMatches]);
                    }
                } else {
                    // Fallback to flat matches if brackets are missing
                    // Group matches by category
                    $groupedMatches = collect($matches)->groupBy('category_id');
                    
                    if ($groupedMatches->isEmpty() && !empty($matches)) {
                        // If no category_id, try grouping by category name if available, or just put all in one bracket
                        $groupedMatches = collect($matches)->groupBy(function($m) {
                            return $m['category']['name'] ?? 'General';
                        });
                    }

                    foreach ($groupedMatches as $catKey => $matchesInCat) {
                        // Find category info
                        $category = $categories->firstWhere('id', $catKey);
                        if (!$category) {
                            $category = $categories->firstWhere('name', $catKey);
                        }

                        $categoryLabel = ($category['name'] ?? null) ?? (is_string($catKey) ? $catKey : null);
                        $categoryName = ($category['weight_category'] ?? $category['weightCategory'] ?? $category['category'] ?? null) ?? ($categoryLabel ?? 'Unknown');
                        $gender = ($category['gender'] ?? $matchesInCat->first()['gender'] ?? null);

                        if (!$gender) {
                            $gender = $this->detectGender($categoryLabel ?? $categoryName);
                        }
                        $ageCategory = $this->normalizeAgeCategoryLabel(
                            $category['age_category'] ?? $category['ageCategory'] ?? $category['age'] ?? $category['division'] ?? $category['classification'] ?? null
                        ) ?? $this->extractAgeCategoryFromName($categoryLabel);

                        $bracketMatches = [];
                        foreach ($matchesInCat as $matchData) {
                            $savedMatch = $this->saveMatch($matchData, $tournamentId, $tournamentName, $categoryName, $players, $gender, $ageCategory, $categoryLabel);
                            
                            // Map local ID to the match data for frontend use
                            $matchData['local_id'] = $savedMatch->id;
                            
                            // Ensure display fields are mapped for frontend
                            $matchData['player_red_name'] = $savedMatch->player1_name;
                            $matchData['player_blue_name'] = $savedMatch->player2_name;
                            $matchData['player_red_team'] = $savedMatch->player1_team;
                                $matchData['player_blue_team'] = $savedMatch->player2_team;
                                 $matchData['gender'] = $savedMatch->gender;
                                 $matchData['bracket_name'] = $categoryName;
 
                                 $bracketMatches[] = $matchData;
                            $totalMatches++;
                        }

                        $hierarchicalBrackets[] = [
                            'id' => is_numeric($catKey) ? $catKey : rand(1000, 9999),
                            'name' => $categoryName,
                            'gender' => $gender,
                            'matches' => $bracketMatches
                        ];
                    }
                }

                DB::commit();

                $tournament = [
                    'id' => $tournamentData['id'] ?? $tournamentId,
                    'name' => $tournamentName,
                    'description' => $tournamentData['description'] ?? '',
                    'brackets' => $hierarchicalBrackets
                ];

                // Persist local mapping of tournament ID -> name for offline usage
                try {
                    $mapPath = storage_path('app/tournament_map.json');
                    $map = [];
                    if (file_exists($mapPath)) {
                        $raw = file_get_contents($mapPath);
                        $map = json_decode($raw, true) ?: [];
                    }
                    $map[(string)$tournamentId] = $tournamentName;
                    @file_put_contents($mapPath, json_encode($map, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
                } catch (\Throwable $e) {
                    Log::warning("Unable to persist tournament map: " . $e->getMessage());
                }

                return [
                    'success' => true, 
                    'message' => "Tournament '{$tournamentName}' synced successfully with {$totalMatches} matches.", 
                    'tournament' => $tournament,
                    'count' => $totalMatches
                ];

            } catch (\Exception $e) {
                try { DB::rollBack(); } catch (\Throwable) {}
                Log::error("Database sync error: " . $e->getMessage() . "\n" . $e->getTraceAsString());
                return ['success' => false, 'message' => 'Database error during sync: ' . $e->getMessage()];
            }

        } catch (\Throwable $e) {
            return $this->syncTransportFailure('sync', $e);
        }
    }

    public function scoreboardData($tournamentId)
    {
        try {
            $response = $this->client()->get($this->url("tournaments/{$tournamentId}/scoreboard-data"));
            if (!$response->successful()) {
                return [
                    'success' => false, 
                    'message' => "Online system error (Status: {$response->status()})"
                ];
            }
            $data = $response->json();
            $tournament = $data['tournament'] ?? null;
            $brackets = $data['brackets'] ?? [];
            foreach ($brackets as &$b) {
                if (isset($b['matches']) && is_array($b['matches'])) {
                    // Compute max round number for stage inference
                    $maxRound = 0;
                    foreach ($b['matches'] as $m) {
                        $rn = $m['round_number'] ?? null;
                        if (is_numeric($rn)) {
                            $n = (int)$rn;
                            if ($n > $maxRound) $maxRound = $n;
                        }
                    }
                    // Attach stage label and sort key
                    foreach ($b['matches'] as &$m) {
                        // Stage label from known fields
                        $stage = '';
                        $rnText = trim((string)($m['round_name'] ?? ''));
                        if ($rnText !== '') {
                            if (preg_match('/\bfinals?\b/i', $rnText)) $stage = 'Finals';
                            elseif (preg_match('/\bbronze\b/i', $rnText)) $stage = 'Bronze';
                            elseif (preg_match('/\bsemi[- ]?finals?\b/i', $rnText)) $stage = 'Semi Finals';
                            elseif (preg_match('/\bquarter[- ]?finals?\b/i', $rnText)) $stage = 'Quarterfinals';
                        }
                        if ($stage === '') {
                            $ro = $m['round_order'] ?? null;
                            if (is_numeric($ro)) {
                                $ro = (int)$ro;
                                if ($ro >= 90) $stage = 'Finals';
                                elseif ($ro >= 80) $stage = 'Bronze';
                                elseif ($ro >= 70) $stage = 'Semi Finals';
                                elseif ($ro >= 60) $stage = 'Quarterfinals';
                            }
                        }
                        if ($stage === '' && $maxRound > 0 && is_numeric($m['round_number'] ?? null)) {
                            $n = (int)$m['round_number'];
                            if ($n === $maxRound) $stage = 'Finals';
                            elseif ($n === $maxRound - 1) $stage = 'Semi Finals';
                            elseif ($n === $maxRound - 2) $stage = 'Quarterfinals';
                        }
                        if ($stage === '' && is_numeric($m['round_number'] ?? null)) {
                            $stage = 'Round ' . (int)$m['round_number'];
                        } elseif ($stage === '') {
                            $stage = 'Round';
                        }
                        $m['_stageLabel'] = $stage;
                        if (empty($m['round_name'])) {
                            $m['round_name'] = $stage;
                        }
                        // Sort key: prefer round_order, then round_number, then global order
                        if (is_numeric($m['round_order'] ?? null)) {
                            $m['_roundSortKey'] = (int)$m['round_order'];
                        } elseif (is_numeric($m['round_number'] ?? null)) {
                            $m['_roundSortKey'] = (int)$m['round_number'];
                        } else {
                            $m['_roundSortKey'] = (int)($m['global_match_order'] ?? 9999);
                        }
                        if (!isset($m['round_order']) || !is_numeric($m['round_order'])) {
                            $m['round_order'] = $m['_roundSortKey'];
                        }
                    }
                    unset($m);
                    // Sort by round key ascending so early rounds first, then by match/global order
                    usort($b['matches'], function($a, $b) {
                        $a1 = $a['_roundSortKey'] ?? 9999;
                        $b1 = $b['_roundSortKey'] ?? 9999;
                        if ($a1 !== $b1) return $a1 <=> $b1;
                        $a2 = $a['match_number'] ?? 0;
                        $b2 = $b['match_number'] ?? 0;
                        if ($a2 !== $b2) return $a2 <=> $b2;
                        $a3 = $a['global_match_order'] ?? 0;
                        $b3 = $b['global_match_order'] ?? 0;
                        return $a3 <=> $b3;
                    });
                }
            }
            return [
                'success' => true,
                'tournament' => $tournament,
                'brackets' => $brackets
            ];
        } catch (\Exception $e) {
            return ['success' => false, 'message' => 'Offline mode: Cannot connect to server.'];
        }
    }

    /**
     * Read the prepared active queue for one tournament ring from the admin system.
     */
    public function ringQueue(int $tournamentId, int $ring): array
    {
        try {
            $response = $this->client()->get($this->url("tournaments/{$tournamentId}/rings/{$ring}/queue"));
            if (! $response->successful()) {
                return [
                    'success' => false,
                    'message' => "Online system error (Status: {$response->status()})",
                ];
            }

            $data = $response->json();
            if (! is_array($data)) {
                return [
                    'success' => false,
                    'message' => 'Online system returned an invalid queue payload.',
                ];
            }

            return array_merge(['success' => true], $data);
        } catch (\Throwable $e) {
            Log::error("Connection error during ringQueue: " . $e->getMessage());
            return ['success' => false, 'message' => 'Offline mode: Cannot connect to server.'];
        }
    }

    /**
     * Read the prepared fixed-size display batch for one tournament ring from the admin system.
     */
    public function ringDisplayBatch(int $tournamentId, int $ring, int $limit = 5): array
    {
        try {
            $response = $this->client()->get(
                $this->url("tournaments/{$tournamentId}/rings/{$ring}/display-batch"),
                ['limit' => max(1, min($limit, 20))]
            );
            if (! $response->successful()) {
                return [
                    'success' => false,
                    'message' => "Online system error (Status: {$response->status()})",
                ];
            }

            $data = $response->json();
            if (! is_array($data)) {
                return [
                    'success' => false,
                    'message' => 'Online system returned an invalid display batch payload.',
                ];
            }

            return array_merge(['success' => true], $data);
        } catch (\Throwable $e) {
            Log::error("Connection error during ringDisplayBatch: " . $e->getMessage());
            return ['success' => false, 'message' => 'Offline mode: Cannot connect to server.'];
        }
    }

    /**
     * Read queue diagnostics for one tournament ring from the admin system.
     */
    public function ringQueueDiagnostics(int $tournamentId, int $ring): array
    {
        try {
            $response = $this->client()->get($this->url("tournaments/{$tournamentId}/rings/{$ring}/queue-diagnostics"));
            if (! $response->successful()) {
                return [
                    'success' => false,
                    'message' => "Online system error (Status: {$response->status()})",
                ];
            }

            $data = $response->json();
            if (! is_array($data)) {
                return [
                    'success' => false,
                    'message' => 'Online system returned an invalid queue diagnostics payload.',
                ];
            }

            return array_merge(['success' => true], $data);
        } catch (\Throwable $e) {
            Log::error("Connection error during ringQueueDiagnostics: " . $e->getMessage());
            return ['success' => false, 'message' => 'Offline mode: Cannot connect to server.'];
        }
    }

    /**
     * Map online system match status to local scoreboard status.
     */
    protected function mapMatchStatus($remoteStatus)
    {
        $map = [
            'scheduled' => 'pending',
            'ongoing' => 'current',
            'completed' => 'completed',
        ];

        return $map[$remoteStatus] ?? 'pending';
    }

    /**
     * Save or update a single match during sync.
     */
    protected function saveMatch($matchData, $tournamentId, $tournamentName, $categoryName, $players, $gender = null, $ageCategory = null, $categoryLabel = null)
    {
        // Remote match ID
        $remoteMatchId = $matchData['id'] ?? $matchData['match_id'] ?? null;

        // Kurash scoreboard: player1 = green, player2 = blue. Remote APIs may send
        // player_green/player_blue, player_right/player_left, or legacy player_red/player_blue.
        $p1Obj = $matchData['player_green'] ?? $matchData['player_right'] ?? $matchData['player_red'] ?? $matchData['player1'] ?? null;
        $p2Obj = $matchData['player_blue'] ?? $matchData['player_left'] ?? $matchData['player2'] ?? null;

        $p1Id = $matchData['player_green_id'] ?? $matchData['player_right_id'] ?? $matchData['player_red_id'] ?? $matchData['player1_id']
            ?? (is_array($p1Obj) ? ($p1Obj['id'] ?? null) : null);
        $p2Id = $matchData['player_blue_id'] ?? $matchData['player_left_id'] ?? $matchData['player2_id']
            ?? (is_array($p2Obj) ? ($p2Obj['id'] ?? null) : null);

        // Lookup players to get extra info (like club/team)
        $player1 = $players->firstWhere('id', $p1Id);
        $player2 = $players->firstWhere('id', $p2Id);

        // Names (flat keys first, then nested objects, then player roster)
        $player1Name = $matchData['player_green_name'] ?? $matchData['player1_name'] ?? $matchData['player_red_name']
            ?? (is_array($p1Obj) ? ($p1Obj['full_name'] ?? $p1Obj['name'] ?? null) : null)
            ?? ($player1['full_name'] ?? $player1['name'] ?? 'TBD');
        $player2Name = $matchData['player_blue_name'] ?? $matchData['player2_name'] ?? $matchData['player_left_name']
            ?? (is_array($p2Obj) ? ($p2Obj['full_name'] ?? $p2Obj['name'] ?? null) : null)
            ?? ($player2['full_name'] ?? $player2['name'] ?? 'TBD');

        // Team/club
        $player1Team = ($player1['club'] ?? null)
            ?? (is_array($p1Obj) ? ($p1Obj['club'] ?? null) : null)
            ?? $matchData['player_green_team'] ?? $matchData['player1_team'] ?? $matchData['player_red_team'] ?? null;
        $player2Team = ($player2['club'] ?? null)
            ?? (is_array($p2Obj) ? ($p2Obj['club'] ?? null) : null)
            ?? $matchData['player_blue_team'] ?? $matchData['player2_team'] ?? null;

        // Detect gender from match data if not provided
        if (!$gender) {
            $gender = $matchData['gender'] ?? null;
            if (!$gender && ($categoryLabel || $categoryName)) {
                $gender = $this->detectGender($categoryLabel ?: $categoryName);
            }
        }

        $resolvedAgeCategory = $this->normalizeAgeCategoryLabel(
            $matchData['age_category'] ?? $matchData['ageCategory'] ?? $matchData['age'] ?? $matchData['division'] ?? $matchData['classification'] ?? null
        );
        if (!$resolvedAgeCategory) {
            $resolvedAgeCategory = $this->normalizeAgeCategoryLabel($ageCategory);
        }
        if (!$resolvedAgeCategory) {
            $resolvedAgeCategory = $this->extractAgeCategoryFromName($categoryLabel);
        }
        if (!$resolvedAgeCategory) {
            $resolvedAgeCategory = $this->inferAgeCategory($categoryLabel ?: $categoryName);
        }

        $mn = (int) ($matchData['match_number'] ?? $matchData['matchNumber'] ?? $matchData['global_match_order'] ?? $matchData['match_order'] ?? 0);

        // Preserve local completion and richer names if present (only for the same match + tournament).
        $existing = null;
        if ($remoteMatchId !== null && $remoteMatchId !== '') {
            $existing = TournamentMatch::where('remote_id', $remoteMatchId)->first();
        } else {
            $q = TournamentMatch::query()
                ->whereNull('remote_id')
                ->where('category', $categoryName)
                ->where('match_number', $mn);
            if ($this->hasTournamentIdColumn() && $tournamentId) {
                $q->where('tournament_id', $tournamentId);
            } else {
                $q->where('tournament_name', $tournamentName);
            }
            $existing = $q->first();
        }

        $mappedStatus = $this->mapMatchStatus($matchData['status'] ?? 'pending');
        $finalStatus = $mappedStatus;
        $preserve = [];
        if ($existing) {
            $sameTournament = false;
            if ($this->hasTournamentIdColumn() && $tournamentId) {
                $sameTournament = (int) ($existing->tournament_id ?? 0) === (int) $tournamentId;
            } else {
                $sameTournament = (string) ($existing->tournament_name ?? '') === (string) $tournamentName;
            }

            // Prefer non-placeholder names from local DB
            if ($sameTournament && $this->isPlaceholderName($player1Name) && !$this->isPlaceholderName($existing->player1_name)) {
                $player1Name = $existing->player1_name;
            }
            if ($sameTournament && $this->isPlaceholderName($player2Name) && !$this->isPlaceholderName($existing->player2_name)) {
                $player2Name = $existing->player2_name;
            }
            // Do not downgrade a locally completed match to pending/ongoing
            if ($sameTournament && $existing->status === 'completed' && $mappedStatus !== 'completed') {
                $finalStatus = 'completed';
                $preserve['winner'] = $existing->winner;
                $preserve['result_details'] = $existing->result_details;
            } elseif (!$sameTournament && $existing->status === 'completed' && $mappedStatus !== 'completed') {
                // Collision safety: prevent a different tournament from inheriting old winners/scores.
                $preserve['winner'] = null;
                $preserve['result_details'] = null;
            }
        }

        $roundRaw = $matchData['round'] ?? $matchData['round_name'] ?? $matchData['round_number'] ?? null;
        if (is_numeric($roundRaw)) {
            $roundStr = 'Round '.((int) $roundRaw);
        } elseif (is_string($roundRaw) && trim($roundRaw) !== '') {
            $roundStr = trim($roundRaw);
        } else {
            $roundStr = 'Group Stage';
        }

        $ringRaw = $matchData['ring_number'] ?? $matchData['ring'] ?? $matchData['mat'] ?? $matchData['mat_number']
            ?? $matchData['matNumber'] ?? $matchData['ringNumber'] ?? null;
        $ringNumber = null;
        if (is_numeric($ringRaw)) {
            $ringNumber = (int) $ringRaw;
        } elseif (is_string($ringRaw) && preg_match('/(\d+)/', $ringRaw, $m)) {
            $ringNumber = (int) $m[1];
        }
        if ($existing && $ringNumber === null && $existing->ring_number) {
            $ringNumber = (int) $existing->ring_number;
        }

        $baseAttrs = array_merge([
            'tournament_name' => $tournamentName,
            'match_number' => $mn,
            'category' => $categoryName,
            'gender' => $gender,
            'age_category' => $resolvedAgeCategory,
            'round' => $roundStr,
            'player1_name' => $player1Name,
            'player1_team' => $player1Team,
            'player1_remote_id' => $p1Id,
            'player2_name' => $player2Name,
            'player2_team' => $player2Team,
            'player2_remote_id' => $p2Id,
            'status' => $finalStatus,
            'next_match_id' => $matchData['next_match_id'] ?? $matchData['winner_to_match_id'] ?? null,
            'next_match_slot' => $matchData['next_match_slot'] ?? $matchData['winner_to_slot'] ?? null,
        ], $preserve);

        // Prevent sync failures if the migration hasn't been applied yet.
        if ($this->hasTournamentIdColumn()) {
            $baseAttrs['tournament_id'] = $tournamentId;
        }

        // Prevent sync failures if the migration hasn't been applied yet.
        if ($this->hasRingNumberColumn()) {
            $baseAttrs['ring_number'] = $ringNumber;
        }

        // updateOrCreate(['remote_id' => null], ...) would always hit the first null row — breaks sync.
        if ($remoteMatchId !== null && $remoteMatchId !== '') {
            return TournamentMatch::updateOrCreate(
                ['remote_id' => $remoteMatchId],
                $baseAttrs
            );
        }

        $ident = [
            'tournament_name' => $tournamentName,
            'category' => $categoryName,
            'match_number' => $mn,
            'remote_id' => null,
        ];
        if ($this->hasTournamentIdColumn()) {
            $ident['tournament_id'] = $tournamentId;
        }

        return TournamentMatch::updateOrCreate($ident, $baseAttrs);
    }

    /**
     * Infer age category from the category name.
     */
    protected function inferAgeCategory($categoryName)
    {
        $byName = $this->extractAgeCategoryFromName(is_string($categoryName) ? $categoryName : null);
        if ($byName) {
            return $byName;
        }

        return 'Seniors';
    }

    protected function normalizeAgeCategoryLabel($label): ?string
    {
        if ($label === null) {
            return null;
        }
        $s = trim((string) $label);
        if ($s === '') {
            return null;
        }
        $s = str_replace('–', '-', $s);
        $s = preg_replace('/\s+/', ' ', $s);

        return $s;
    }

    /**
     * Extract a human-readable age category from a bracket/category label.
     *
     * Examples:
     * - "Male - Kids 4-7" => "Kids 4-7"
     * - "Female - Senior 18+" => "Senior 18+"
     */
    protected function extractAgeCategoryFromName($name): ?string
    {
        $s = $this->normalizeAgeCategoryLabel($name);
        if (!$s) {
            return null;
        }

        // Normalize a common prefix style: "Male - Kids 4-7" / "Female - Senior 18+"
        // We still search the full string, but extracting the matching part prevents gender noise.
        $patterns = [
            // U15/U17/U21...
            '/\bU\s*\d+\b/i',

            // Kids 4-7, Kids 8-11...
            '/\bKids\b\s*\d+\s*-\s*\d+\b/i',
            '/\bKids\b/i',

            // Cadets 14-15...
            '/\bCadets?\b\s*\d+\s*-\s*\d+\b/i',
            '/\bCadets?\b/i',

            // Juniors 16-17...
            '/\bJuniors?\b\s*\d+\s*-\s*\d+\b/i',
            '/\bJuniors?\b/i',

            // Senior 18+ / Seniors
            '/\bSenior(?:s)?\b\s*\d+\s*\+?\b/i',
            '/\bSenior(?:s)?\b/i',

            // Veterans
            '/\bVeterans?\b/i',
        ];

        foreach ($patterns as $p) {
            if (preg_match($p, $s, $m)) {
                $raw = $this->normalizeAgeCategoryLabel($m[0]);
                if (!$raw) {
                    continue;
                }
                // Canonicalize Uxx (remove spaces and uppercase)
                if (preg_match('/^U\\s*\\d+$/i', $raw)) {
                    return strtoupper(str_replace(' ', '', $raw));
                }
                // Canonicalize "Seniors 18+" => "Senior 18+" if the range is present
                if (preg_match('/^Seniors\\b\\s*\\d+/i', $raw)) {
                    $raw = preg_replace('/^Seniors\\b/i', 'Senior', $raw);
                }

                return $raw;
            }
        }

        return null;
    }

    protected function isPlaceholderName($name): bool
    {
        $s = trim((string) $name);
        if ($s === '') return true;
        return preg_match('/^(tbd|bye|-+)$/i', $s) === 1;
    }

    protected function extractRoundNumber($round): ?int
    {
        if (is_numeric($round)) {
            return (int) $round;
        }

        $text = is_string($round) ? trim($round) : '';
        if ($text !== '' && preg_match('/(\d+)/', $text, $m)) {
            return (int) $m[1];
        }

        return null;
    }

    protected function normalizeScoreValue($value): int
    {
        if (is_array($value) && array_key_exists('k', $value)) {
            $value = $value['k'];
        }

        if (is_numeric($value)) {
            return (int) $value;
        }

        return 0;
    }

    protected function contextValue(array $context, array $keys, $fallback = null)
    {
        foreach ($keys as $key) {
            if (!array_key_exists($key, $context)) {
                continue;
            }

            $value = $context[$key];
            if ($value !== null && $value !== '') {
                return $value;
            }
        }

        return $fallback;
    }

    protected function traceId(array $context): ?string
    {
        $value = $this->contextValue($context, ['trace_id'], null);
        if ($value === null || $value === '') {
            return null;
        }

        return (string) $value;
    }

    protected function frontendBuildStamp(): ?string
    {
        $manifestPath = public_path('build/manifest.json');
        if (is_file($manifestPath)) {
            $mtime = @filemtime($manifestPath);
            return $mtime ? 'manifest:'.gmdate(DATE_ATOM, $mtime) : 'manifest:present';
        }

        $hotPath = public_path('hot');
        if (is_file($hotPath)) {
            $value = trim((string) @file_get_contents($hotPath));
            return $value !== '' ? 'hot:'.$value : 'hot:present';
        }

        return null;
    }

    protected function runtimeIdentity(): array
    {
        return array_filter([
            'app_env' => app()->environment(),
            'app_url' => config('app.url'),
            'storage_path' => storage_path(),
            'frontend_build_stamp' => $this->frontendBuildStamp(),
        ], function ($value) {
            return $value !== null && $value !== '';
        });
    }

    public function resultSyncRuntimeIdentity(): array
    {
        return $this->runtimeIdentity();
    }

    protected function logResultSyncTrace(string $stage, array $context = [], string $level = 'info'): void
    {
        $payload = array_merge([
            'stage' => $stage,
            'runtime' => $this->runtimeIdentity(),
        ], array_filter($context, function ($value) {
            return $value !== null;
        }));

        try {
            Log::{$level}('[result-sync] '.$stage, $payload);
        } catch (\Throwable $e) {
            Log::info('[result-sync] '.$stage);
        }
    }

    protected function requestLogHeaders(): array
    {
        return array_filter([
            'Accept' => 'application/json',
            'Content-Type' => 'application/json',
            'X-API-KEY' => $this->apiKey !== '' ? '[redacted]' : null,
        ], function ($value) {
            return $value !== null && $value !== '';
        });
    }

    protected function responseLogContext($response): array
    {
        return [
            'response_status' => $response->status(),
            'response_content_type' => (string) $response->header('Content-Type'),
            'response_body' => (string) $response->body(),
        ];
    }

    protected function remoteMatchId(TournamentMatch $match, array $context = [])
    {
        return $this->contextValue($context, ['match_id'], $match->remote_id);
    }

    protected function syncResult(
        bool $success,
        string $message,
        ?string $failureClass = null,
        ?string $rejectReason = null,
        ?string $resultTraceId = null
    ): array {
        return array_filter([
            'success' => $success,
            'message' => $message,
            'sync_failure_class' => $failureClass,
            'reject_reason' => $rejectReason,
            'result_trace_id' => $resultTraceId,
        ], function ($value, $key) {
            return $key === 'success' || $key === 'message' || ($value !== null && $value !== '');
        }, ARRAY_FILTER_USE_BOTH);
    }

    protected function mutationResponseOutcome($response, string $fallbackMessage): array
    {
        $contentType = strtolower((string) $response->header('Content-Type'));
        $body = trim((string) $response->body());
        $bodyStart = strtolower(substr(ltrim($body), 0, 16));
        $json = null;

        if ($body !== '') {
            try {
                $decoded = $response->json();
                if (is_array($decoded)) {
                    $json = $decoded;
                }
            } catch (\Throwable $e) {
                $json = null;
            }
        }

        $rejectReason = is_array($json) ? trim((string) ($json['reject_reason'] ?? '')) : '';
        $resultTraceId = is_array($json) ? trim((string) ($json['result_trace_id'] ?? '')) : '';
        $message = is_array($json) ? trim((string) ($json['message'] ?? $json['error'] ?? '')) : '';

        if (
            $response->successful()
            && is_array($json)
            && array_key_exists('success', $json)
            && $json['success'] === true
        ) {
            return $this->syncResult(
                true,
                $message !== '' ? $message : 'Admin request succeeded.',
                null,
                $rejectReason !== '' ? $rejectReason : null,
                $resultTraceId !== '' ? $resultTraceId : null
            );
        }

        if (is_array($json) && array_key_exists('success', $json) && $json['success'] === false) {
            return $this->syncResult(
                false,
                $message !== '' ? $message : $fallbackMessage,
                'admin_reject',
                $rejectReason !== '' ? $rejectReason : null,
                $resultTraceId !== '' ? $resultTraceId : null
            );
        }

        if (is_array($json) && $rejectReason !== '') {
            return $this->syncResult(
                false,
                $message !== '' ? $message : $fallbackMessage,
                'admin_reject',
                $rejectReason,
                $resultTraceId !== '' ? $resultTraceId : null
            );
        }

        if (str_contains($contentType, 'text/html') || str_starts_with($bodyStart, '<!doctype') || str_starts_with($bodyStart, '<html')) {
            return $this->syncResult(
                false,
                'Admin API returned HTML instead of JSON.',
                'unexpected_response',
                $rejectReason !== '' ? $rejectReason : null,
                $resultTraceId !== '' ? $resultTraceId : null
            );
        }

        if ($body === '') {
            return $this->syncResult(
                false,
                'Admin API returned an empty response.',
                'unexpected_response',
                $rejectReason !== '' ? $rejectReason : null,
                $resultTraceId !== '' ? $resultTraceId : null
            );
        }

        if (!is_array($json)) {
            return $this->syncResult(
                false,
                'Admin API returned a non-JSON response.',
                'unexpected_response',
                $rejectReason !== '' ? $rejectReason : null,
                $resultTraceId !== '' ? $resultTraceId : null
            );
        }

        return $this->syncResult(
            false,
            $message !== '' ? $message : $fallbackMessage,
            'unexpected_response',
            $rejectReason !== '' ? $rejectReason : null,
            $resultTraceId !== '' ? $resultTraceId : null
        );
    }

    protected function buildCanonicalResultPayload(TournamentMatch $match, int $winnerId, array $context = []): array
    {
        $tournamentId = $this->contextValue($context, ['tournament_id'], $match->tournament_id);
        $ringNumber = $this->contextValue($context, ['ring_number', 'ring'], $match->ring_number);
        $matchId = $this->contextValue($context, ['match_id'], $match->remote_id);
        $roundNumber = $this->contextValue($context, ['round_number'], $this->extractRoundNumber($match->round));
        $matchNumber = $this->contextValue($context, ['match_number'], $match->match_number);
        $playerOneName = $this->contextValue($context, ['player_one_name'], $match->player1_name);
        $playerTwoName = $this->contextValue($context, ['player_two_name'], $match->player2_name);
        $weightCategory = $this->contextValue($context, ['weight_category'], $match->category);

        $payload = [
            'winner_id' => $winnerId,
            'red_score' => $this->normalizeScoreValue($match->result_details['score_p1'] ?? 0),
            'blue_score' => $this->normalizeScoreValue($match->result_details['score_p2'] ?? 0),
            'details' => $match->result_details,
            'status' => 'completed',
            'match_id' => $matchId,
            'round_number' => $roundNumber,
            'match_number' => $matchNumber,
            'player_one_name' => $playerOneName,
            'player_two_name' => $playerTwoName,
            'weight_category' => $weightCategory,
            'tournament_id' => $tournamentId,
        ];

        if ($ringNumber !== null && $ringNumber !== '') {
            $payload['ring'] = $ringNumber;
            $payload['ring_number'] = $ringNumber;
        }

        return array_filter($payload, function ($value) {
            return $value !== null && $value !== '';
        });
    }

    /**
     * Update a match on the online server.
     */
    public function updateMatchOnServer(TournamentMatch $match, array $changes, array $context = [])
    {
        $remoteMatchId = $this->remoteMatchId($match, $context);
        if ($remoteMatchId === null || $remoteMatchId === '') {
            $this->logResultSyncTrace('admin.update.missing_remote_match_id', [
                'trace_id' => $this->traceId($context),
                'local_match_id' => $match->id,
                'remote_match_id' => $match->remote_id,
                'payload' => $changes,
            ], 'warning');
            return $this->syncResult(false, 'Missing remote match ID for admin update.');
        }

        $url = $this->url("matches/{$remoteMatchId}/update");
        $traceId = $this->traceId($context);
        $this->logResultSyncTrace('admin.update.request', [
            'trace_id' => $traceId,
            'local_match_id' => $match->id,
            'remote_match_id' => $match->remote_id,
            'request_match_id' => $remoteMatchId,
            'url' => $url,
            'method' => 'POST',
            'headers' => $this->requestLogHeaders(),
            'payload' => $changes,
        ]);

        try {
            $response = $this->client()->post($url, $changes);
            $responseContext = array_merge([
                'trace_id' => $traceId,
                'url' => $url,
                'request_match_id' => $remoteMatchId,
            ], $this->responseLogContext($response));

            $outcome = $this->mutationResponseOutcome($response, 'Server rejected update.');
            if (!$outcome['success']) {
                $this->logResultSyncTrace('admin.update.failed', array_merge($responseContext, [
                    'message' => $outcome['message'],
                    'sync_failure_class' => $outcome['sync_failure_class'] ?? null,
                    'reject_reason' => $outcome['reject_reason'] ?? null,
                    'result_trace_id' => $outcome['result_trace_id'] ?? null,
                ]), 'warning');
                return $outcome;
            }

            $this->logResultSyncTrace('admin.update.response', array_merge($responseContext, [
                'result_trace_id' => $outcome['result_trace_id'] ?? null,
            ]));
            return $this->syncResult(
                true,
                'Match updated online.',
                null,
                null,
                $outcome['result_trace_id'] ?? null
            );
        } catch (\Exception $e) {
            $this->logResultSyncTrace('admin.update.exception', [
                'trace_id' => $traceId,
                'url' => $url,
                'request_match_id' => $remoteMatchId,
                'message' => $e->getMessage(),
            ], 'error');
            return $this->syncResult(
                false,
                'Offline: Cannot update match online.',
                'network_failure'
            );
        }
    }

    /**
     * Send a single match result to the online server.
     */
    public function sendMatchResult(TournamentMatch $match, array $context = [])
    {
        if (!$match->winner || $match->status !== 'completed') {
            return $this->syncResult(false, 'Match not completed.');
        }

        try {
            $winnerIdFromContext = $this->contextValue($context, ['winner_id'], null);
            $winnerId = $winnerIdFromContext !== null && $winnerIdFromContext !== ''
                ? (int) $winnerIdFromContext
                : ($match->winner === 'player1'
                    ? $match->player1_remote_id
                    : ($match->winner === 'player2' ? $match->player2_remote_id : null));

            if (!$winnerId) {
                $this->logResultSyncTrace('admin.result.skipped_missing_winner_id', [
                    'trace_id' => $this->traceId($context),
                    'local_match_id' => $match->id,
                    'remote_match_id' => $match->remote_id,
                    'winner' => $match->winner,
                    'winner_id_from_context' => $winnerIdFromContext,
                    'player1_remote_id' => $match->player1_remote_id,
                    'player2_remote_id' => $match->player2_remote_id,
                ], 'warning');
                return $this->syncResult(
                    false,
                    'Missing authoritative winner_id. Result saved locally pending sync.',
                    'skipped_missing_winner_id'
                );
            }

            $remoteMatchId = $this->remoteMatchId($match, $context);
            if ($remoteMatchId === null || $remoteMatchId === '') {
                $this->logResultSyncTrace('admin.result.missing_remote_match_id', [
                    'trace_id' => $this->traceId($context),
                    'local_match_id' => $match->id,
                    'remote_match_id' => $match->remote_id,
                ], 'warning');
                return $this->syncResult(false, 'Missing remote match ID for admin result sync.');
            }

            $payload = $this->buildCanonicalResultPayload($match, (int) $winnerId, $context);
            $url = $this->url("matches/{$remoteMatchId}/result");
            $traceId = $this->traceId($context);
            $this->logResultSyncTrace('admin.result.request', [
                'trace_id' => $traceId,
                'local_match_id' => $match->id,
                'remote_match_id' => $match->remote_id,
                'request_match_id' => $remoteMatchId,
                'winner_id_source' => $winnerIdFromContext !== null && $winnerIdFromContext !== '' ? 'context' : 'local_match',
                'url' => $url,
                'method' => 'POST',
                'headers' => $this->requestLogHeaders(),
                'payload' => $payload,
            ]);

            $response = $this->client()->post($url, $payload);
            $responseContext = array_merge([
                'trace_id' => $traceId,
                'url' => $url,
                'request_match_id' => $remoteMatchId,
            ], $this->responseLogContext($response));

            $outcome = $this->mutationResponseOutcome($response, 'Server rejected result. Saved locally.');
            if (!$outcome['success']) {
                $this->logResultSyncTrace('admin.result.failed', array_merge($responseContext, [
                    'message' => $outcome['message'],
                    'sync_failure_class' => $outcome['sync_failure_class'] ?? null,
                    'reject_reason' => $outcome['reject_reason'] ?? null,
                    'result_trace_id' => $outcome['result_trace_id'] ?? null,
                ]), 'warning');
                return $outcome;
            }

            $this->logResultSyncTrace('admin.result.response', array_merge($responseContext, [
                'result_trace_id' => $outcome['result_trace_id'] ?? null,
            ]));
            $this->logResultSyncTrace('admin.result.accepted', [
                'trace_id' => $traceId,
                'local_match_id' => $match->id,
                'remote_match_id' => $match->remote_id,
                'request_match_id' => $remoteMatchId,
                'result_trace_id' => $outcome['result_trace_id'] ?? null,
                'follow_up_update' => 'skipped',
                'follow_up_reason' => 'result_endpoint_authoritative',
            ]);

            $match->markAsSynced();
            return $this->syncResult(
                true,
                'Admin accepted completed match result.',
                null,
                null,
                $outcome['result_trace_id'] ?? null
            );

        } catch (\Exception $e) {
            $this->logResultSyncTrace('admin.result.exception', [
                'trace_id' => $this->traceId($context),
                'local_match_id' => $match->id,
                'remote_match_id' => $match->remote_id,
                'message' => $e->getMessage(),
            ], 'error');
            return $this->syncResult(
                false,
                'Offline. Result saved locally pending sync.',
                'network_failure'
            );
        }
    }

    /**
     * Retry sending all pending results.
     */
    public function syncPendingResults()
    {
        $pendingMatches = TournamentMatch::where('status', 'completed')
            ->where('is_synced', false)
            ->whereNotNull('remote_id')
            ->orderBy('updated_at')
            ->orderBy('id')
            ->get();

        $syncedCount = 0;
        $errors = [];

        foreach ($pendingMatches as $match) {
            $result = $this->sendMatchResult($match);
            if ($result['success']) {
                $syncedCount++;
            } else {
                $errors[] = "Match {$match->match_number}: {$result['message']}";
            }
        }

        return [
            'success' => count($errors) === 0,
            'synced_count' => $syncedCount,
            'remaining' => $pendingMatches->count() - $syncedCount,
            'errors' => $errors
        ];
    }

    /**
     * Infer gender from category name.
     */
    protected function detectGender($categoryName)
    {
        if (!$categoryName) return null;
        
        $categoryName = strtoupper($categoryName);
        
        $femaleKeywords = ['FEMALE', 'WOMEN', 'GIRLS', 'WOMAN', 'GIRL'];
        $maleKeywords = ['MALE', 'MEN', 'BOYS', 'MAN', 'BOY'];
        
        foreach ($femaleKeywords as $keyword) {
            if (str_contains($categoryName, $keyword)) return 'female';
        }
        
        foreach ($maleKeywords as $keyword) {
            if (str_contains($categoryName, $keyword)) return 'male';
        }
        
        return null;
    }
}
