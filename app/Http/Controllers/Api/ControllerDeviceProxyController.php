<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ControllerDeviceProxyService;
use Illuminate\Http\Request;

class ControllerDeviceProxyController extends Controller
{
    public function __construct(
        protected ControllerDeviceProxyService $proxyService
    ) {
    }

    public function pair(Request $request)
    {
        return $this->forwardProxyResponse(
            $this->proxyService->pair(
                $request->only(['code', 'device_id', 'name', 'client']),
                $this->forwardedHeaders($request)
            )
        );
    }

    public function heartbeat(Request $request)
    {
        $deviceId = $this->extractForwardedDeviceId($request);
        $payload = $request->only(['device_id', 'client']);
        if (!isset($payload['device_id']) || trim((string) $payload['device_id']) === '') {
            $payload['device_id'] = $deviceId;
        }

        return $this->forwardProxyResponse(
            $this->proxyService->heartbeat(
                $payload,
                $this->forwardedHeaders($request)
            )
        );
    }

    public function assignedSetup(Request $request)
    {
        return $this->forwardProxyResponse(
            $this->proxyService->assignedSetup(
                $this->forwardedHeaders($request),
                $this->forwardedQuery($request)
            )
        );
    }

    protected function forwardedHeaders(Request $request): array
    {
        $adminBase = trim((string) $request->query('admin_base', $request->input('admin_base', '')));
        $this->proxyService->setBaseUrl($adminBase);

        return [
            'Authorization' => $request->header('Authorization'),
            'X-Controller-Device-Id' => $this->extractForwardedDeviceId($request),
        ];
    }

    protected function forwardedQuery(Request $request): array
    {
        $deviceId = $this->extractForwardedDeviceId($request);

        return array_filter([
            'device_id' => $deviceId,
        ], static fn ($value) => $value !== null && trim((string) $value) !== '');
    }

    protected function extractForwardedDeviceId(Request $request): ?string
    {
        $deviceId = trim((string) $request->header('X-Controller-Device-Id'));
        if ($deviceId !== '') {
            return $deviceId;
        }

        $deviceId = trim((string) $request->input('device_id'));
        if ($deviceId !== '') {
            return $deviceId;
        }

        $deviceId = trim((string) $request->query('device_id'));
        return $deviceId !== '' ? $deviceId : null;
    }

    protected function forwardProxyResponse(array $result)
    {
        if (!empty($result['transport_error'])) {
            return response()->json([
                'success' => false,
                'error' => $result['error'] ?? 'admin_proxy_error',
                'message' => $result['message'] ?? 'The controller could not complete the Admin Host request.',
                'details' => $result['details'] ?? null,
            ], (int) ($result['status'] ?? 500));
        }

        if (!empty($result['is_json'])) {
            return response()->json($result['decoded_body'], (int) $result['status']);
        }

        return response($result['raw_body'], (int) $result['status'])
            ->header('Content-Type', $result['content_type'] ?: 'text/plain');
    }
}
