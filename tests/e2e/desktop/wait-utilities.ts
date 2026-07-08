import { execSync } from 'child_process';
import net from 'net';
import fs from 'fs';
import os from 'os';
import path from 'path';

export interface ServicePort {
  name: string;
  port: number;
  host?: string;
}

/**
 * Write a PowerShell script to file and execute it
 */
function runPsScript(script: string): string {
  const scriptPath = path.join(os.tmpdir(), `kts-wait-${Date.now()}.ps1`);
  fs.writeFileSync(scriptPath, script, 'utf-8');
  try {
    return execSync(
      `powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "${scriptPath}"`,
      { stdio: 'pipe', timeout: 10000 }
    ).toString().trim();
  } finally {
    try { fs.unlinkSync(scriptPath); } catch {}
  }
}

/**
 * Check if a TCP port is listening
 */
export function isPortListening(port: number, host: string = '127.0.0.1'): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let resolved = false;

    const cleanup = () => {
      if (!resolved) {
        resolved = true;
        socket.destroy();
      }
    };

    socket.setTimeout(2000);
    socket.on('connect', () => {
      cleanup();
      resolve(true);
    });
    socket.on('timeout', () => {
      cleanup();
      resolve(false);
    });
    socket.on('error', () => {
      cleanup();
      resolve(false);
    });
    socket.on('close', () => {
      cleanup();
    });

    socket.connect(port, host);
  });
}

/**
 * Check if a specific port is occupied via netstat
 */
export function isPortOccupiedViaNetstat(port: number): boolean {
  try {
    const output = runPsScript(`
$connections = netstat -ano | Select-String ":${port}.*LISTENING"
if ($connections) { Write-Output "true" } else { Write-Output "false" }
`);
    return output.toLowerCase() === 'true';
  } catch {
    return false;
  }
}

/**
 * Wait for a specific port to become available
 */
export async function waitForPort(
  port: number,
  host: string = '127.0.0.1',
  timeoutMs: number = 30000,
  pollIntervalMs: number = 500
): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const isListening = await isPortListening(port, host);
    if (isListening) {
      console.log(`[Wait] Port ${port} is now listening`);
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
  }

  console.warn(`[Wait] Timeout waiting for port ${port} on ${host}`);
  return false;
}

/**
 * Wait for all required services to be ready
 */
export async function waitForAllServices(
  ports: Record<string, number>,
  options: { timeout?: number; interval?: number } = {}
): Promise<boolean> {
  const { timeout = 120000, interval = 2000 } = options;
  const startTime = Date.now();

  console.log(`[Wait] Waiting for services on ports: ${JSON.stringify(ports)}`);

  while (Date.now() - startTime < timeout) {
    const allReady = await Promise.all(
      Object.entries(ports).map(async ([name, port]) => {
        const ready = await isPortListening(port);
        if (!ready) {
          console.log(`[Wait] ${name} on port ${port} not ready yet`);
        }
        return ready;
      })
    );

    if (allReady.every(Boolean)) {
      console.log('[Wait] All services are ready');
      return true;
    }

    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.log(`[Wait] Waiting... (${elapsed}s elapsed)`);

    await new Promise(resolve => setTimeout(resolve, interval));
  }

  console.error('[Wait] Timeout waiting for services');
  return false;
}

/**
 * Get process IDs listening on a specific port
 */
export function getPidsOnPort(port: number): number[] {
  try {
    const output = runPsScript(`
$port = ${port}
$connections = netstat -ano | Select-String ":${port}\\s"
$pids = @()
foreach ($conn in $connections) {
    if ($conn -match '\\s+(\\d+)$') {
        $pids += [int]$Matches[1]
    }
}
$pids | Sort-Object -Unique | ForEach-Object { Write-Output $_ }
`);
    if (!output) return [];
    return output.split('\n').map(p => parseInt(p.trim(), 10)).filter(p => !isNaN(p));
  } catch {
    return [];
  }
}

/**
 * Wait for a log file to contain specific text
 */
export async function waitForLogText(
  logPath: string,
  text: string,
  timeoutMs: number = 30000
): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    try {
      if (fs.existsSync(logPath)) {
        const content = fs.readFileSync(logPath, 'utf-8');
        if (content.includes(text)) {
          return true;
        }
      }
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return false;
}
