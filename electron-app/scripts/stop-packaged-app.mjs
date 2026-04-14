/**
 * Stops Kurash Scoreboard + PHP/MariaDB from packaged win-unpacked (Windows locks).
 * Invoked by npm prebuild in electron-app before electron-builder runs.
 */
import { execFileSync } from 'child_process'
import { existsSync } from 'fs'
import { platform } from 'os'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

if (platform() !== 'win32') {
  process.exit(0)
}

const ps1 = join(__dirname, 'stop-packaged-app.ps1')
if (!existsSync(ps1)) {
  console.warn('[stop-packaged-app] Missing', ps1)
  process.exit(0)
}

try {
  execFileSync(
    'powershell.exe',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ps1],
    { stdio: 'inherit' }
  )
} catch {
  process.exitCode = 0
}
