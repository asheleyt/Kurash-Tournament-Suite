<?php

namespace Tests\Feature;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ControllerDeviceProxyControllerTest extends TestCase
{
    public function test_pair_success_passthroughs_the_admin_contract(): void
    {
        Http::fake([
            'http://admin.test/api/controller/pair' => Http::response([
                'success' => true,
                'data' => [
                    'token' => 'plain-token',
                    'controller' => [
                        'id' => 123,
                        'device_id' => 'device-1',
                        'name' => 'Controller A',
                        'paired_at' => '2026-04-04T12:34:56+00:00',
                    ],
                    'snapshot' => [
                        'id' => 10,
                        'tournament_id' => 77,
                        'tournament_name' => 'Spring Open',
                        'number_of_rings' => 2,
                    ],
                ],
            ], 200),
        ]);

        $response = $this->postJson('/api/controller/pair?admin_base=http://admin.test/api', [
            'code' => 'PAIR123',
            'device_id' => 'device-1',
            'name' => 'Controller A',
            'client' => [
                'build_id' => 'build-1',
                'last_seen_queue_version' => 't77-r2-aaa',
            ],
        ]);

        $response->assertOk()
            ->assertJsonPath('data.token', 'plain-token')
            ->assertJsonPath('data.controller.device_id', 'device-1')
            ->assertJsonPath('data.snapshot.id', 10);

        Http::assertSent(function ($request) {
            return $request->url() === 'http://admin.test/api/controller/pair'
                && $request->hasHeader('X-API-KEY', 'kurash-scoreboard')
                && $request['code'] === 'PAIR123'
                && $request['device_id'] === 'device-1'
                && $request['client']['build_id'] === 'build-1';
        });
    }

    public function test_pair_invalid_code_passthroughs_validation_errors(): void
    {
        Http::fake([
            'http://admin.test/api/controller/pair' => Http::response([
                'message' => 'The given data was invalid.',
                'errors' => [
                    'code' => ['Invalid or expired pairing code.'],
                ],
            ], 422),
        ]);

        $response = $this->postJson('/api/controller/pair?admin_base=http://admin.test/api', [
            'code' => 'BAD',
            'device_id' => 'device-1',
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('errors.code.0', 'Invalid or expired pairing code.');
    }

    public function test_pair_snapshot_required_passthroughs_the_admin_response(): void
    {
        Http::fake([
            'http://admin.test/api/controller/pair' => Http::response([
                'success' => false,
                'error' => 'snapshot_required',
                'message' => 'An active event snapshot is required.',
                'details' => null,
            ], 412),
        ]);

        $response = $this->postJson('/api/controller/pair?admin_base=http://admin.test/api', [
            'code' => 'PAIR123',
            'device_id' => 'device-1',
        ]);

        $response->assertStatus(412)
            ->assertJsonPath('error', 'snapshot_required');
    }

    public function test_heartbeat_forwards_controller_auth_headers(): void
    {
        Http::fake([
            'http://admin.test/api/controller/heartbeat' => Http::response([
                'success' => true,
                'data' => [
                    'server_time' => '2026-04-04T12:35:30+00:00',
                    'controller' => [
                        'id' => 123,
                        'device_id' => 'device-1',
                        'name' => 'Controller A',
                        'paired_at' => '2026-04-04T12:34:56+00:00',
                        'last_seen_at' => '2026-04-04T12:35:30+00:00',
                        'needs_setup' => true,
                        'last_seen_queue_version' => 't77-r2-aaa',
                    ],
                    'assigned_setup' => null,
                    'assigned_setup_updated_at' => null,
                ],
            ], 200),
        ]);

        $response = $this
            ->withHeaders([
                'Authorization' => 'Bearer known-token',
                'X-Controller-Device-Id' => 'device-1',
            ])
            ->postJson('/api/controller/heartbeat?admin_base=http://admin.test/api', [
                'client' => [
                    'build_id' => 'build-1',
                ],
            ]);

        $response->assertOk()
            ->assertJsonPath('data.controller.device_id', 'device-1')
            ->assertJsonPath('data.assigned_setup', null);

        Http::assertSent(function ($request) {
            return $request->url() === 'http://admin.test/api/controller/heartbeat'
                && $request->hasHeader('Authorization', 'Bearer known-token')
                && $request->hasHeader('X-Controller-Device-Id', 'device-1')
                && $request['client']['build_id'] === 'build-1';
        });
    }

    public function test_heartbeat_token_invalid_passthroughs_the_admin_error(): void
    {
        Http::fake([
            'http://admin.test/api/controller/heartbeat' => Http::response([
                'success' => false,
                'error' => 'controller_token_invalid',
                'message' => 'The controller token is invalid or expired.',
                'details' => null,
            ], 401),
        ]);

        $response = $this
            ->withHeaders([
                'Authorization' => 'Bearer bad-token',
                'X-Controller-Device-Id' => 'device-1',
            ])
            ->postJson('/api/controller/heartbeat?admin_base=http://admin.test/api', []);

        $response->assertStatus(401)
            ->assertJsonPath('error', 'controller_token_invalid');
    }

    public function test_heartbeat_device_mismatch_passthroughs_the_admin_error(): void
    {
        Http::fake([
            'http://admin.test/api/controller/heartbeat' => Http::response([
                'success' => false,
                'error' => 'controller_device_id_mismatch',
                'message' => 'The controller device_id does not match this token.',
                'details' => null,
            ], 401),
        ]);

        $response = $this
            ->withHeaders([
                'Authorization' => 'Bearer known-token',
                'X-Controller-Device-Id' => 'wrong-device',
            ])
            ->postJson('/api/controller/heartbeat?admin_base=http://admin.test/api', []);

        $response->assertStatus(401)
            ->assertJsonPath('error', 'controller_device_id_mismatch');
    }

    public function test_heartbeat_snapshot_mismatch_passthroughs_the_admin_error(): void
    {
        Http::fake([
            'http://admin.test/api/controller/heartbeat' => Http::response([
                'success' => false,
                'error' => 'controller_snapshot_mismatch',
                'message' => 'This controller token belongs to a previous event snapshot.',
                'details' => null,
            ], 401),
        ]);

        $response = $this
            ->withHeaders([
                'Authorization' => 'Bearer known-token',
                'X-Controller-Device-Id' => 'device-1',
            ])
            ->postJson('/api/controller/heartbeat?admin_base=http://admin.test/api', []);

        $response->assertStatus(401)
            ->assertJsonPath('error', 'controller_snapshot_mismatch');
    }

    public function test_assigned_setup_passthroughs_the_current_assignment(): void
    {
        Http::fake([
            'http://admin.test/api/controller/assigned-setup' => Http::response([
                'success' => true,
                'data' => [
                    'controller_id' => 123,
                    'device_id' => 'device-1',
                    'assigned_setup' => [
                        'schema_version' => 1,
                        'snapshot_id' => 10,
                        'tournament_id' => 77,
                        'ring_number' => 2,
                        'targets' => [
                            'A' => ['content_type' => 'scoreboard', 'enabled' => true],
                            'B' => ['content_type' => 'ring_display', 'enabled' => true],
                        ],
                    ],
                    'assigned_setup_updated_at' => '2026-04-04T12:36:10+00:00',
                ],
            ], 200),
        ]);

        $response = $this
            ->withHeaders([
                'Authorization' => 'Bearer known-token',
                'X-Controller-Device-Id' => 'device-1',
            ])
            ->getJson('/api/controller/assigned-setup?admin_base=http://admin.test/api');

        $response->assertOk()
            ->assertJsonPath('data.assigned_setup.tournament_id', 77)
            ->assertJsonPath('data.assigned_setup.targets.B.content_type', 'ring_display');
    }

    public function test_assigned_setup_allows_null_assignments(): void
    {
        Http::fake([
            'http://admin.test/api/controller/assigned-setup' => Http::response([
                'success' => true,
                'data' => [
                    'controller_id' => 123,
                    'device_id' => 'device-1',
                    'assigned_setup' => null,
                    'assigned_setup_updated_at' => null,
                ],
            ], 200),
        ]);

        $response = $this
            ->withHeaders([
                'Authorization' => 'Bearer known-token',
                'X-Controller-Device-Id' => 'device-1',
            ])
            ->getJson('/api/controller/assigned-setup?admin_base=http://admin.test/api');

        $response->assertOk()
            ->assertJsonPath('data.assigned_setup', null);
    }

    public function test_assigned_setup_snapshot_required_passthroughs_the_admin_error(): void
    {
        Http::fake([
            'http://admin.test/api/controller/assigned-setup' => Http::response([
                'success' => false,
                'error' => 'snapshot_required',
                'message' => 'An active event snapshot is required.',
                'details' => null,
            ], 412),
        ]);

        $response = $this
            ->withHeaders([
                'Authorization' => 'Bearer known-token',
                'X-Controller-Device-Id' => 'device-1',
            ])
            ->getJson('/api/controller/assigned-setup?admin_base=http://admin.test/api');

        $response->assertStatus(412)
            ->assertJsonPath('error', 'snapshot_required');
    }

    public function test_controller_proxy_returns_a_local_transport_error_when_admin_host_is_unreachable(): void
    {
        Http::fake(function () {
            throw new ConnectionException('Connection refused');
        });

        $response = $this->postJson('/api/controller/pair?admin_base=http://admin.test/api', [
            'code' => 'PAIR123',
            'device_id' => 'device-1',
        ]);

        $response->assertStatus(503)
            ->assertJsonPath('error', 'admin_host_unreachable');
    }
}
