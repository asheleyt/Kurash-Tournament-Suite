<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  array<int, string>  ...$roles
     */
    public function handle(Request $request, Closure $next, ...$roles): Response
    {
        $user = $request->user();

        if (! $user) {
            abort(Response::HTTP_FORBIDDEN);
        }

        // Normalize roles (handles comma-separated or multiple parameters).
        $roles = collect($roles)
            ->flatMap(fn ($role) => explode(',', (string) $role))
            ->map(fn ($role) => trim($role))
            ->filter()
            ->values()
            ->all();

        if ($roles && ! $user->hasRole($roles)) {
            abort(Response::HTTP_FORBIDDEN, 'You are not authorized to access this page.');
        }

        return $next($request);
    }
}