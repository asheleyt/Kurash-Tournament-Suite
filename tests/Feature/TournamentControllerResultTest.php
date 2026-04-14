<?php

namespace Tests\Feature;

use App\Models\TournamentMatch;
use App\Services\TournamentSyncService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class TournamentControllerResultTest extends TestCase
{
    use RefreshDatabase;

    public function test_post_result_advances_the_winner_into_the_next_match_slot(): void
    {
        $currentMatch = TournamentMatch::create([
            'remote_id' => 1001,
            'tournament_name' => 'Spring Open',
            'match_number' => 1,
            'category' => '-73',
            'round' => 'Round 1',
            'player1_name' => 'Ali Green',
            'player1_team' => 'UZB',
            'player1_remote_id' => 501,
            'player2_name' => 'Bek Blue',
            'player2_team' => 'KAZ',
            'player2_remote_id' => 502,
            'status' => 'current',
            'next_match_id' => 2001,
            'next_match_slot' => 'player1',
        ]);

        $nextMatch = TournamentMatch::create([
            'remote_id' => 2001,
            'tournament_name' => 'Spring Open',
            'match_number' => 2,
            'category' => '-73',
            'round' => 'Round 2',
            'player1_name' => 'TBD',
            'player2_name' => 'Opponent Waiting',
            'status' => 'pending',
        ]);

        $response = $this->postJson("/api/matches/{$currentMatch->remote_id}/result", [
            'winner_id' => 501,
            'red_score' => 10,
            'blue_score' => 0,
        ]);

        $response->assertOk()
            ->assertJsonPath('match.status', 'completed')
            ->assertJsonPath('match.winner', 'player1');

        $this->assertDatabaseHas('matches', [
            'id' => $currentMatch->id,
            'status' => 'completed',
            'winner' => 'player1',
        ]);

        $this->assertDatabaseHas('matches', [
            'id' => $nextMatch->id,
            'player1_name' => 'Ali Green',
            'player1_team' => 'UZB',
            'player1_remote_id' => 501,
        ]);
    }

    public function test_post_result_with_admin_base_syncs_result_using_the_local_relay_with_canonical_admin_payload(): void
    {
        Http::fake([
            'http://admin.test/api/matches/1001/result' => Http::response([
                'success' => true,
                'result_trace_id' => 'trace-accept-1001',
            ], 200),
        ]);

        $match = $this->makeSyncableMatch();

        $response = $this->postJson('/api/matches/1001/result?admin_base=http://admin.test/api', [
            'winner_id' => 501,
            'winner_side' => 'player1',
            'red_score' => 10,
            'blue_score' => 0,
        ]);

        $response->assertOk()
            ->assertJsonPath('sync_status', 'synced')
            ->assertJsonPath('result_trace_id', 'trace-accept-1001');

        $match->refresh();
        $this->assertTrue((bool) $match->is_synced);

        $this->assertCanonicalResultRequest('http://admin.test/api/matches/1001/result', [
            'winner_id' => 501,
            'match_id' => 1001,
            'tournament_id' => 77,
            'ring_number' => 2,
            'match_number' => 1,
            'player_one_name' => 'Ali Green',
            'player_two_name' => 'Bek Blue',
            'weight_category' => '-73',
        ]);

        Http::assertSentCount(1);
    }

    public function test_post_result_with_admin_base_rejects_html_success_responses_as_unexpected(): void
    {
        Http::fake([
            'http://admin.test/api/matches/1001/result' => Http::response(
                '<!DOCTYPE html><html><body>Wrong endpoint</body></html>',
                200,
                ['Content-Type' => 'text/html; charset=utf-8']
            ),
        ]);

        $match = $this->makeSyncableMatch();

        $response = $this->postJson('/api/matches/1001/result?admin_base=http://admin.test/api', [
            'winner_id' => 501,
            'red_score' => 10,
            'blue_score' => 0,
        ]);

        $response->assertOk()
            ->assertJsonPath('sync_status', 'pending_offline')
            ->assertJsonPath('sync_failure_class', 'unexpected_response')
            ->assertJsonPath('message', 'Admin API returned HTML instead of JSON.');

        $match->refresh();
        $this->assertFalse((bool) $match->is_synced);
        Http::assertSentCount(1);
    }

    public function test_post_result_with_admin_base_requires_explicit_admin_success(): void
    {
        Http::fake([
            'http://admin.test/api/matches/1001/result' => Http::response([
                'message' => 'Accepted but missing explicit success.',
            ], 200),
        ]);

        $match = $this->makeSyncableMatch();

        $response = $this->postJson('/api/matches/1001/result?admin_base=http://admin.test/api', [
            'winner_id' => 501,
            'red_score' => 10,
            'blue_score' => 0,
        ]);

        $response->assertOk()
            ->assertJsonPath('sync_status', 'pending_offline')
            ->assertJsonPath('sync_failure_class', 'unexpected_response')
            ->assertJsonPath('message', 'Accepted but missing explicit success.');

        $match->refresh();
        $this->assertFalse((bool) $match->is_synced);
        Http::assertSentCount(1);
    }

    public function test_post_result_with_admin_base_uses_request_context_when_local_match_context_is_stale(): void
    {
        Http::fake([
            'http://admin.test/api/matches/1001/result' => Http::response(['success' => true], 200),
        ]);

        $match = TournamentMatch::create([
            'remote_id' => 1001,
            'tournament_name' => 'Spring Open',
            'match_number' => 1,
            'category' => 'Local Category',
            'round' => 'Round 1',
            'player1_name' => 'Local Green',
            'player1_team' => 'UZB',
            'player1_remote_id' => 501,
            'player2_name' => 'Local Blue',
            'player2_team' => 'KAZ',
            'player2_remote_id' => 502,
            'status' => 'current',
        ]);

        $response = $this->postJson('/api/matches/1001/result?admin_base=http://admin.test/api', [
            'winner_id' => 501,
            'winner_side' => 'player1',
            'red_score' => 10,
            'blue_score' => 0,
            'tournament_id' => 77,
            'ring' => 2,
            'ring_number' => 2,
            'match_id' => 1001,
            'round_number' => 3,
            'match_number' => 9,
            'player_one_name' => 'Queue Green',
            'player_two_name' => 'Queue Blue',
            'weight_category' => '-81',
        ]);

        $response->assertOk()
            ->assertJsonPath('sync_status', 'synced');

        $match->refresh();
        $this->assertTrue((bool) $match->is_synced);

        $this->assertCanonicalResultRequest('http://admin.test/api/matches/1001/result', [
            'winner_id' => 501,
            'match_id' => 1001,
            'tournament_id' => 77,
            'ring' => 2,
            'ring_number' => 2,
            'round_number' => 3,
            'match_number' => 9,
            'player_one_name' => 'Queue Green',
            'player_two_name' => 'Queue Blue',
            'weight_category' => '-81',
        ]);

        Http::assertSentCount(1);
    }

    public function test_post_result_with_admin_base_uses_request_match_id_for_admin_urls_when_local_remote_id_is_stale(): void
    {
        Http::fake([
            'http://admin.test/api/matches/1001/result' => Http::response(['success' => true], 200),
        ]);

        $match = $this->makeSyncableMatch([
            'remote_id' => 4444,
        ]);

        $response = $this->postJson("/api/matches/{$match->id}/result?admin_base=http://admin.test/api", [
            'winner_id' => 501,
            'red_score' => 10,
            'blue_score' => 0,
            'tournament_id' => 77,
            'ring_number' => 2,
            'match_id' => 1001,
        ]);

        $response->assertOk()
            ->assertJsonPath('sync_status', 'synced');

        $this->assertCanonicalResultRequest('http://admin.test/api/matches/1001/result', [
            'winner_id' => 501,
            'match_id' => 1001,
            'tournament_id' => 77,
            'ring_number' => 2,
        ]);

        Http::assertSentCount(1);
    }

    public function test_post_result_with_admin_base_preserves_admin_reject_reason_and_trace_id(): void
    {
        Http::fake([
            'http://admin.test/api/matches/1001/result' => Http::response([
                'success' => false,
                'message' => 'Winner side conflicts with canonical player mapping.',
                'reject_reason' => 'winner_side_conflict',
                'result_trace_id' => 'trace-reject-1001',
            ], 200),
        ]);

        $match = $this->makeSyncableMatch();

        $response = $this->postJson('/api/matches/1001/result?admin_base=http://admin.test/api', [
            'winner_id' => 501,
            'winner_side' => 'player1',
            'red_score' => 10,
            'blue_score' => 0,
        ]);

        $response->assertOk()
            ->assertJsonPath('sync_status', 'pending_offline')
            ->assertJsonPath('sync_failure_class', 'admin_reject')
            ->assertJsonPath('reject_reason', 'winner_side_conflict')
            ->assertJsonPath('result_trace_id', 'trace-reject-1001');

        $match->refresh();
        $this->assertFalse((bool) $match->is_synced);
        Http::assertSentCount(1);
    }

    public function test_post_result_with_admin_base_treats_match_not_ready_as_admin_reject_even_on_http_409(): void
    {
        Http::fake([
            'http://admin.test/api/matches/1001/result' => Http::response([
                'message' => 'Match not ready yet.',
                'reject_reason' => 'match_not_ready',
                'result_trace_id' => 'trace-reconcile-1001',
            ], 409),
        ]);

        $match = $this->makeSyncableMatch();

        $response = $this->postJson('/api/matches/1001/result?admin_base=http://admin.test/api', [
            'winner_id' => 501,
            'winner_side' => 'player1',
            'red_score' => 10,
            'blue_score' => 0,
        ]);

        $response->assertOk()
            ->assertJsonPath('sync_status', 'pending_offline')
            ->assertJsonPath('sync_failure_class', 'admin_reject')
            ->assertJsonPath('reject_reason', 'match_not_ready')
            ->assertJsonPath('result_trace_id', 'trace-reconcile-1001');

        $match->refresh();
        $this->assertFalse((bool) $match->is_synced);
        Http::assertSentCount(1);
    }

    public function test_post_result_with_admin_base_does_not_require_obsolete_follow_up_update(): void
    {
        Http::fake([
            'http://admin.test/api/matches/1001/result' => Http::response(['success' => true], 200),
        ]);

        $match = $this->makeSyncableMatch();

        $response = $this->postJson('/api/matches/1001/result?admin_base=http://admin.test/api', [
            'winner_id' => 501,
            'red_score' => 10,
            'blue_score' => 0,
            'tournament_id' => 77,
            'ring_number' => 2,
            'match_id' => 1001,
        ]);

        $response->assertOk()
            ->assertJsonPath('sync_status', 'synced')
            ->assertJsonPath('message', 'Admin accepted completed match result.');

        $match->refresh();
        $this->assertTrue((bool) $match->is_synced);

        Http::assertSent(function ($request) {
            return $request->url() === 'http://admin.test/api/matches/1001/result';
        });
        Http::assertSentCount(1);
    }

    public function test_post_result_with_admin_base_preserves_network_failures(): void
    {
        Http::fake([
            'http://admin.test/api/matches/1001/result' => Http::failedConnection(),
        ]);

        $match = $this->makeSyncableMatch();

        $response = $this->postJson('/api/matches/1001/result?admin_base=http://admin.test/api', [
            'winner_id' => 501,
            'red_score' => 10,
            'blue_score' => 0,
        ]);

        $response->assertOk()
            ->assertJsonPath('sync_status', 'pending_offline')
            ->assertJsonPath('sync_failure_class', 'network_failure');

        $match->refresh();
        $this->assertFalse((bool) $match->is_synced);
        Http::assertSentCount(1);
    }

    public function test_post_result_with_admin_base_skips_remote_submit_when_authoritative_winner_id_is_unresolved(): void
    {
        Http::fake();

        $match = $this->makeSyncableMatch([
            'player1_remote_id' => null,
            'player2_remote_id' => 502,
        ]);

        $response = $this->postJson('/api/matches/1001/result?admin_base=http://admin.test/api', [
            'winner_side' => 'player1',
            'red_score' => 10,
            'blue_score' => 0,
        ]);

        $response->assertOk()
            ->assertJsonPath('match.status', 'completed')
            ->assertJsonPath('match.winner', 'player1')
            ->assertJsonPath('sync_status', 'pending_offline')
            ->assertJsonPath('sync_failure_class', 'skipped_missing_winner_id');

        $match->refresh();
        $this->assertSame('completed', $match->status);
        $this->assertSame('player1', $match->winner);
        $this->assertFalse((bool) $match->is_synced);
        Http::assertSentCount(0);
    }

    public function test_sync_pending_results_replays_oldest_unsynced_results_first(): void
    {
        $olderMatch = $this->makeSyncableMatch([
            'remote_id' => 1001,
            'match_number' => 1,
        ]);
        $olderMatch->forceFill([
            'status' => 'completed',
            'winner' => 'player1',
            'result_details' => [
                'score_p1' => 10,
                'score_p2' => 0,
            ],
            'is_synced' => false,
        ]);
        $olderMatch->timestamps = false;
        $olderMatch->updated_at = now()->subMinutes(2);
        $olderMatch->save();
        $olderMatch->timestamps = true;

        $newerMatch = $this->makeSyncableMatch([
            'remote_id' => 1002,
            'match_number' => 2,
        ]);
        $newerMatch->forceFill([
            'status' => 'completed',
            'winner' => 'player2',
            'result_details' => [
                'score_p1' => 4,
                'score_p2' => 10,
            ],
            'is_synced' => false,
        ]);
        $newerMatch->timestamps = false;
        $newerMatch->updated_at = now()->subMinute();
        $newerMatch->save();
        $newerMatch->timestamps = true;

        $requestUrls = [];
        Http::fake(function ($request) use (&$requestUrls) {
            $requestUrls[] = $request->url();

            return Http::response([
                'success' => true,
            ], 200);
        });

        $service = app(TournamentSyncService::class);
        $service->setBaseUrl('http://admin.test/api');
        $result = $service->syncPendingResults();

        $this->assertTrue($result['success']);
        $this->assertSame(2, $result['synced_count']);
        $this->assertSame([
            'http://admin.test/api/matches/1001/result',
            'http://admin.test/api/matches/1002/result',
        ], $requestUrls);

        $olderMatch->refresh();
        $newerMatch->refresh();
        $this->assertTrue((bool) $olderMatch->is_synced);
        $this->assertTrue((bool) $newerMatch->is_synced);
    }

    private function makeSyncableMatch(array $overrides = []): TournamentMatch
    {
        return TournamentMatch::create(array_merge([
            'tournament_id' => 77,
            'remote_id' => 1001,
            'tournament_name' => 'Spring Open',
            'match_number' => 1,
            'category' => '-73',
            'ring_number' => 2,
            'round' => 'Round 1',
            'player1_name' => 'Ali Green',
            'player1_team' => 'UZB',
            'player1_remote_id' => 501,
            'player2_name' => 'Bek Blue',
            'player2_team' => 'KAZ',
            'player2_remote_id' => 502,
            'status' => 'current',
        ], $overrides));
    }

    private function assertCanonicalResultRequest(string $url, array $expected): void
    {
        Http::assertSent(function ($request) use ($url, $expected) {
            $data = $request->data();

            if ($request->url() !== $url || !is_array($data)) {
                return false;
            }

            if (array_key_exists('winner', $data) || array_key_exists('winner_side', $data)) {
                return false;
            }

            foreach ($expected as $key => $value) {
                if (($data[$key] ?? null) !== $value) {
                    return false;
                }
            }

            return true;
        });
    }
}
