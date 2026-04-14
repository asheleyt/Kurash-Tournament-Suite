/**
 * After `npm run build` at repo root, copies `public/` and `resources/` into an existing
 * win-unpacked tree. Uses dereference: true so Laravel's `public/storage` symlink is
 * copied as real files (Windows often blocks creating symlinks without Developer Mode).
 *
 * Usage (from repo root): npm run sync:electron-dist
 */
import { spawnSync } from 'child_process'
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '..', '..')

// Avoid EPERM / partial copies while the packaged app still has laravel\public open.
if (process.platform === 'win32') {
  const stopper = join(__dirname, 'stop-packaged-app.mjs')
  spawnSync(process.execPath, [stopper], { stdio: 'inherit' })
}

const laravelCandidates = [
  join(repoRoot, 'electron-app', 'build-output', 'win-unpacked', 'resources', 'laravel'),
  join(repoRoot, 'electron-app', 'dist', 'win-unpacked', 'resources', 'laravel'),
]

const fromEnv = process.env.KURASH_ELECTRON_LARAVEL?.trim()
const laravelDest =
  fromEnv && existsSync(fromEnv)
    ? fromEnv
    : laravelCandidates.find((p) => existsSync(p))

const publicSrc = join(repoRoot, 'public')
const resourcesSrc = join(repoRoot, 'resources')
const storagePublicSrc = join(repoRoot, 'storage', 'app', 'public')

/** Copy tree; follow symlinks so we never try to create symlinks on Windows (EPERM). */
const copyOpts = { recursive: true, dereference: true }

if (!existsSync(join(repoRoot, 'public', 'build'))) {
  console.error(
    '[sync-laravel-to-dist] Missing public/build. Run from repo root: npm run build'
  )
  process.exit(1)
}

if (!laravelDest) {
  console.error(
    '[sync-laravel-to-dist] No packaged Laravel folder found. Tried:\n ',
    laravelCandidates.join('\n  '),
    '\n  Run npm run build:electron once, or set KURASH_ELECTRON_LARAVEL to .../resources/laravel'
  )
  process.exit(1)
}

mkdirSync(laravelDest, { recursive: true })

console.log('[sync-laravel-to-dist] Target:', laravelDest)

const publicDest = join(laravelDest, 'public')
const publicStorageDest = join(publicDest, 'storage')
const resourcesDest = join(laravelDest, 'resources')

function syncPublicToDist() {
  /**
   * Copy `public/` but avoid copying `public/storage` directly.
   *
   * On Windows, Laravel's `public/storage` is often a Junction/Symlink to `storage/app/public`.
   * The packaged Electron output can already contain a Junction that points back to the repo,
   * which can make Node's `cpSync` think src/dest are the same path and fail with EINVAL.
   *
   * We copy everything under `public/` except `storage`, then copy `storage/app/public` into
   * `public/storage` as real files.
   */
  mkdirSync(publicDest, { recursive: true })

  if (existsSync(publicStorageDest)) {
    rmSync(publicStorageDest, { recursive: true, force: true })
  }

  for (const entry of readdirSync(publicSrc, { withFileTypes: true })) {
    if (entry.name === 'storage') continue
    cpSync(join(publicSrc, entry.name), join(publicDest, entry.name), copyOpts)
  }

  mkdirSync(publicStorageDest, { recursive: true })
  if (existsSync(storagePublicSrc)) {
    cpSync(storagePublicSrc, publicStorageDest, copyOpts)
  }
}

syncPublicToDist()
console.log('[sync-laravel-to-dist] Copied public/ →', join(laravelDest, 'public'))

cpSync(resourcesSrc, resourcesDest, copyOpts)
console.log('[sync-laravel-to-dist] Copied resources/ →', join(laravelDest, 'resources'))

console.log('[sync-laravel-to-dist] Done. Restart Kurash Scoreboard.exe.')
