<?php

use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;

if (! function_exists('kurashRuntimeEnv')) {
    function kurashRuntimeEnv(string $key): ?string
    {
        $value = $_ENV[$key] ?? $_SERVER[$key] ?? getenv($key);

        if ($value === false || $value === null) {
            return null;
        }

        $value = trim((string) $value);

        if ($value === '') {
            return null;
        }

        $_ENV[$key] = $value;
        $_SERVER[$key] = $value;
        putenv($key.'='.$value);

        return $value;
    }
}

$storagePath = kurashRuntimeEnv('LARAVEL_STORAGE_PATH');
$runtimeCacheEnvKeys = [
    'APP_SERVICES_CACHE',
    'APP_PACKAGES_CACHE',
    'APP_CONFIG_CACHE',
    'APP_ROUTES_CACHE',
    'APP_EVENTS_CACHE',
];

foreach ($runtimeCacheEnvKeys as $cacheEnvKey) {
    kurashRuntimeEnv($cacheEnvKey);
}

$app = Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->validateCsrfTokens(except: [
            'api/*',
            'broadcast/*',
            '*/broadcast/*',
            'broadcast*',
        ]);

        $middleware->encryptCookies(except: ['appearance', 'sidebar_state']);

        $middleware->web(append: [
            HandleAppearance::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Never return Ignition HTML for /api/* â€” Electron fetch expects JSON.
        $exceptions->shouldRenderJsonWhen(function (Request $request, \Throwable $e) {
            return $request->is('api/*') || $request->expectsJson();
        });
    })
    ->create();

if (is_string($storagePath) && $storagePath !== '') {
    $app->useStoragePath($storagePath);
}

foreach ($runtimeCacheEnvKeys as $cacheEnvKey) {
    $cachePath = kurashRuntimeEnv($cacheEnvKey);

    if (! is_string($cachePath) || $cachePath === '') {
        continue;
    }

    if (preg_match('/^[A-Za-z]:[\\\\\/]/', $cachePath) !== 1) {
        continue;
    }

    $drivePrefix = substr($cachePath, 0, 3);
    $app->addAbsoluteCachePathPrefix($drivePrefix);
    $app->addAbsoluteCachePathPrefix(str_replace('\\', '/', $drivePrefix));
}

return $app;
