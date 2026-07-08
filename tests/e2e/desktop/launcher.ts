import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import os from 'os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface ProcessHandle {
  name: string;
  pid: number;
  executablePath: string;
  startTime: number;
}

export interface LaunchOptions {
  executablePath: string;
  name: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
  startupTimeout?: number;
}

export interface LaunchResult {
  handle: ProcessHandle | null;
  started: boolean;
  error?: string;
}

function resolveExecutablePath(executablePath: string): string {
  if (path.isAbsolute(executablePath)) return executablePath;

  const candidates = [
    path.resolve(__dirname, '..', '..', executablePath),
    path.resolve(__dirname, '..', '..', '..', '..', executablePath),
    path.resolve(__dirname, executablePath),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  return path.resolve(__dirname, executablePath);
}

/**
 * Write a PowerShell script to file for execution
 */
function writePsScript(content: string, prefix: string): string {
  const scriptPath = path.join(os.tmpdir(), `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}.ps1`);
  fs.writeFileSync(scriptPath, content, 'utf-8');
  return scriptPath;
}

/**
 * Launch a portable Electron executable using WMI Win32_Process.Create().
 *
 * WMI creates the process in a completely independent process tree,
 * separate from the calling process. This is critical when running
 * inside Playwright worker processes, because Playwright may kill the
 * entire process tree when a worker exits. WMI-created processes
 * survive this cleanup.
 *
 * This method:
 * 1. Creates a PowerShell script that calls Win32_Process.Create()
 * 2. Executes the script to spawn the process
 * 3. Returns the PID for tracking
 *
 * Environment variables are set via the application's startup mechanism
 * rather than through the WMI process creation, since WMI's Create()
 * method does not support setting environment variables directly.
 */
export async function launchPortable(options: LaunchOptions): Promise<LaunchResult> {
  const { executablePath, name, args = [], env = {}, cwd, startupTimeout = 60000 } = options;

  const resolvedPath = resolveExecutablePath(executablePath);
  if (!fs.existsSync(resolvedPath)) {
    return { handle: null, started: false, error: `Executable not found: ${resolvedPath}` };
  }

  const workingDir = cwd || path.dirname(resolvedPath);

  console.log(`[${name}] Launching: ${resolvedPath}`);
  console.log(`[${name}] Working dir: ${workingDir}`);

  // Build environment variables for the process
  // We'll set them before calling Create() via $env: in the script
  const envLines = Object.entries({ ...env, KURASH_ELECTRON_INSTANCE: `e2e-${Date.now()}` })
    .map(([k, v]) => `$env:${k} = '${v}'`)
    .join('\n');

  // Build the full command line with arguments
  // Always include --no-sandbox for Electron in E2E tests to prevent
  // the sandbox from causing the process to exit immediately when
  // launched via WMI (independent process tree, no parent console)
  const allArgs = ['--no-sandbox', ...args];
  const fullCmd = `"${resolvedPath}" ${allArgs.map(a => `"${a}"`).join(' ')}`;

  // Create PowerShell script using WMI Win32_Process.Create()
  // This creates a process in an independent process tree
  // Use single-quoted strings in PowerShell to avoid escaping issues with paths containing spaces
  const psScript = `
${envLines}
$mc = New-Object System.Management.ManagementClass('Win32_Process')
$inParams = $mc.GetMethodParameters('Create')
$inParams['CommandLine'] = '${fullCmd.replace(/'/g, "''")}'
$inParams['CurrentDirectory'] = '${workingDir.replace(/'/g, "''")}'
$out = $mc.InvokeMethod('Create', $inParams, $null)
if ($out['ReturnValue'] -ne 0) {
    Write-Error "WMI Create failed with return value $($out['ReturnValue'])"
    exit 1
}
Write-Output $out['ProcessId']
`.trim();

  const scriptPath = writePsScript(psScript, 'kts-wmi-launch');

  try {
    const pidStr = execSync(
      `powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "${scriptPath}"`,
      { stdio: 'pipe', timeout: 30000 }
    ).toString().trim();

    const pid = parseInt(pidStr, 10);
    if (isNaN(pid) || pid <= 0) {
      return { handle: null, started: false, error: `Failed to parse PID from WMI output: "${pidStr}"` };
    }

    const handle: ProcessHandle = { name, pid, executablePath: resolvedPath, startTime: Date.now() };
    console.log(`[${name}] Process launched with PID ${pid}`);

    // Verify process is alive with retry logic
    // WMI-created processes may take a few seconds to fully initialize
    // before they appear in the process list
    const maxRetries = 3;
    const retryDelayMs = 2000;
    let alive = false;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      await new Promise(resolve => setTimeout(resolve, retryDelayMs));
      if (isProcessRunning(pid)) {
        alive = true;
        console.log(`[${name}] Process confirmed alive after ${(attempt + 1) * retryDelayMs}ms`);
        break;
      }
      console.log(`[${name}] Process check attempt ${attempt + 1}/${maxRetries} failed, retrying...`);
    }

    if (!alive) {
      return { handle, started: false, error: `Process exited immediately (PID: ${pid}) after ${maxRetries} retries` };
    }

    return { handle, started: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { handle: null, started: false, error: `Failed to launch via WMI: ${msg}` };
  } finally {
    try { fs.unlinkSync(scriptPath); } catch {}
  }
}

/**
 * Check if a process is running by PID
 */
export function isProcessRunning(pid: number): boolean {
  try {
    if (process.platform === 'win32') {
      const output = execSync(`tasklist /FI "PID eq ${pid}" /NH`, { stdio: 'pipe' }).toString();
      return output.includes(String(pid));
    }
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Kill a process by PID (and its children)
 */
export function killProcess(handle: ProcessHandle): void {
  if (!handle.pid) return;
  try {
    if (isProcessRunning(handle.pid)) {
      execSync(`taskkill /PID ${handle.pid} /F /T`, { stdio: 'pipe' });
      console.log(`[${handle.name}] Process ${handle.pid} killed`);
    }
  } catch (error) {
    console.error(`[${handle.name}] Error killing process:`, error);
  }
}

/**
 * Kill all process handles
 */
export function killAllProcesses(handles: ProcessHandle[]): void {
  for (const handle of handles) {
    killProcess(handle);
  }
}
