<?php

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;

class ControllerDeviceProxyService
{
    protected string $baseUrl = '';

    protected string $apiKey;

    public function __construct()
    {
        $this->apiKey = (string) env('KURASH_API_KEY', env('API_KEY', 'kurash-scoreboard'));
    }

    public function setBaseUrl(?string $base): void
    {
        $this->baseUrl = $this->normalizeBaseUrl($base);
    }

    public function pair(array $payload, array $headers = []): array
    {
        return $this->sendJsonRequest('post', 'controller/pair', $payload, $headers);
    }

    public function heartbeat(array $payload, array $headers = []): array
    {
        return $this->sendJsonRequest('post', 'controller/heartbeat', $payload, $headers);
    }

    public function assignedSetup(array $headers = [], array $query = []): array
    {
        return $this->sendJsonRequest('get', 'controller/assigned-setup', null, $headers, $query);
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

    protected function url(string $path): string
    {
        if ($this->baseUrl === '') {
            throw new \RuntimeException('Admin Host address is required.');
        }

        return $this->baseUrl . '/' . ltrim($path, '/');
    }

    protected function client(array $headers = [])
    {
        $baseHeaders = array_filter([
            'Accept' => 'application/json',
            'X-API-KEY' => $this->apiKey !== '' ? $this->apiKey : null,
            'Authorization' => $this->normalizeHeaderValue($headers['Authorization'] ?? null),
            'X-Controller-Device-Id' => $this->normalizeHeaderValue($headers['X-Controller-Device-Id'] ?? null),
        ], static fn ($value) => $value !== null && $value !== '');

        return Http::withHeaders($baseHeaders)->acceptJson()->timeout(10);
    }

    protected function normalizeHeaderValue(mixed $value): ?string
    {
        $text = trim((string) $value);
        return $text === '' ? null : $text;
    }

    protected function sendJsonRequest(
        string $method,
        string $path,
        ?array $payload = null,
        array $headers = [],
        array $query = []
    ): array
    {
        $query = array_filter($query, static fn ($value) => $value !== null && trim((string) $value) !== '');

        try {
            $response = match (strtolower($method)) {
                'get' => $this->client($headers)->get($this->url($path), $query),
                'post' => $this->client($headers)->post($this->url($path), $payload ?? []),
                default => throw new \InvalidArgumentException("Unsupported proxy method [{$method}]."),
            };
        } catch (ConnectionException $e) {
            return [
                'transport_error' => true,
                'status' => 503,
                'error' => 'admin_host_unreachable',
                'message' => 'Could not reach the Admin Host over the local event network.',
                'details' => null,
            ];
        } catch (\RuntimeException $e) {
            return [
                'transport_error' => true,
                'status' => 422,
                'error' => 'admin_base_required',
                'message' => $e->getMessage(),
                'details' => null,
            ];
        } catch (\Throwable $e) {
            return [
                'transport_error' => true,
                'status' => 500,
                'error' => 'admin_proxy_error',
                'message' => 'The controller could not complete the Admin Host request.',
                'details' => null,
            ];
        }

        $body = (string) $response->body();
        $decoded = null;
        $isJson = false;

        if ($body !== '') {
            $decoded = json_decode($body, true);
            $isJson = json_last_error() === JSON_ERROR_NONE;
        } else {
            $decoded = [];
            $isJson = true;
        }

        return [
            'transport_error' => false,
            'status' => $response->status(),
            'is_json' => $isJson,
            'decoded_body' => $decoded,
            'raw_body' => $body,
            'content_type' => (string) $response->header('Content-Type', 'application/json'),
        ];
    }
}
