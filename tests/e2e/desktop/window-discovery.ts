import { execSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

export interface WindowInfo {
  title: string;
  processId: number;
  processName: string;
  hwnd: number; // Window handle (HWND)
  /** Window width in pixels (may be 0 if not retrievable via Get-Process) */
  width?: number;
  /** Window height in pixels (may be 0 if not retrievable via Get-Process) */
  height?: number;
}

/**
 * Type alias for backward compatibility with legacy validation specs.
 */
export type WindowHandle = WindowInfo;

/**
 * Write a PowerShell script to file and return the path
 */
function writePsScript(content: string, prefix: string): string {
  const scriptPath = path.join(os.tmpdir(), `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}.ps1`);
  fs.writeFileSync(scriptPath, content, 'utf-8');
  return scriptPath;
}

/**
 * Execute a PowerShell script and return trimmed output
 */
function runPsScript(script: string): string {
  const scriptPath = writePsScript(script, 'kts-ps');
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
 * Find all windows with a title containing the given string.
 * Uses Get-Process for reliable window enumeration.
 */
export function findWindowsByTitle(titleSubstring: string): WindowInfo[] {
  const script = `
Get-Process | Where-Object { $_.MainWindowTitle -ne '' } |
  Select-Object Id, ProcessName, MainWindowTitle, MainWindowHandle |
  ForEach-Object {
    "$($_.ProcessName)|$($_.Id)|$($_.MainWindowTitle)|$($_.MainWindowHandle)"
  }
`.trim();

  const output = runPsScript(script);
  if (!output) return [];

  const excludeProcesses = ['Code', 'chrome', 'firefox', 'opera', 'msedge', 'Cooledit', 'GitHub'];

  return output.split('\n')
    .map(line => {
      const parts = line.split('|');
      if (parts.length < 4) return null;
      return {
        processName: parts[0].trim(),
        processId: parseInt(parts[1], 10),
        title: parts[2].trim(),
        hwnd: parseInt(parts[3], 10),
      };
    })
    .filter((w): w is WindowInfo => {
      if (!w || isNaN(w.processId)) return false;
      if (excludeProcesses.some(ex => w.processName.toLowerCase().includes(ex.toLowerCase()))) return false;
      if (titleSubstring && !w.title.toLowerCase().includes(titleSubstring.toLowerCase())) return false;
      return true;
    });
}

/**
 * Find windows that belong to the KTS application.
 * Uses Get-Process which reliably returns MainWindowTitle for the process.
 */
export function findKTSWindows(): WindowInfo[] {
  const results: WindowInfo[] = [];

  try {
    const script = `
Get-Process -Name "Kurash Scoreboard" -ErrorAction SilentlyContinue |
  Where-Object { $_.MainWindowHandle -ne 0 } |
  Select-Object Id, ProcessName, MainWindowTitle, MainWindowHandle |
  ForEach-Object {
    "$($_.ProcessName)|$($_.Id)|$($_.MainWindowTitle)|$($_.MainWindowHandle)"
  }
`.trim();

    const output = runPsScript(script);
    if (!output) return results;

    for (const line of output.split('\n')) {
      const parts = line.split('|');
      if (parts.length >= 4) {
        const title = parts[2].trim();
        const hwnd = parseInt(parts[3], 10);
        const pid = parseInt(parts[1], 10);
        if (!isNaN(pid) && pid > 0) {
          results.push({
            processName: parts[0].trim(),
            processId: pid,
            title,
            hwnd,
          });
        }
      }
    }
  } catch (error) {
    console.error('[WindowDiscovery] Error finding KTS processes:', error);
  }

  return results;
}

/**
 * Find a specific window by exact title match
 */
export function findWindowByTitle(exactTitle: string): WindowInfo | null {
  const allWindows = findWindowsByTitle('');
  return allWindows.find(w => w.title === exactTitle) || null;
}

/**
 * Find all visible windows on the system.
 * Used by legacy validation specs — filters out common system/browser processes.
 */
export function getAllWindows(): WindowInfo[] {
  return findWindowsByTitle('');
}

/**
 * Find windows belonging to a specific process name.
 * Uses Get-Process which reliably returns window info.
 */
export function findWindowsByProcess(processName: string): WindowInfo[] {
  const script = `
Get-Process -ErrorAction SilentlyContinue |
  Where-Object { $_.ProcessName -eq '${processName}' -or $_.ProcessName -like '${processName}*' } |
  Where-Object { $_.MainWindowHandle -ne 0 } |
  Select-Object Id, ProcessName, MainWindowTitle, MainWindowHandle |
  ForEach-Object {
    "$($_.ProcessName)|$($_.Id)|$($_.MainWindowTitle)|$($_.MainWindowHandle)"
  }
`.trim();

  const output = runPsScript(script);
  if (!output) return [];

  return output.split('\n')
    .map(line => {
      const parts = line.split('|');
      if (parts.length < 4) return null;
      return {
        processName: parts[0].trim(),
        processId: parseInt(parts[1], 10),
        title: parts[2].trim(),
        hwnd: parseInt(parts[3], 10),
      };
    })
    .filter((w): w is WindowInfo => {
      if (!w || isNaN(w.processId)) return false;
      return true;
    });
}

/**
 * Resize a window to the specified dimensions using Win32 API.
 */
export function resizeWindow(hwnd: number, width: number, height: number): boolean {
  if (!hwnd || hwnd === 0) {
    console.warn('[WindowDiscovery] Cannot resize window: invalid HWND');
    return false;
  }

  try {
    const script = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Win32Resize {
    [DllImport("user32.dll")]
    public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
}
"@
$hwnd = [IntPtr]::new(${hwnd})
$result = [Win32Resize]::SetWindowPos($hwnd, [IntPtr]::Zero, 0, 0, ${width}, ${height}, 0x0040)
Write-Output $result.ToString().ToLower()
`.trim();

    const output = runPsScript(script);
    const success = output.toLowerCase() === 'true';
    if (success) {
      console.log(`[WindowDiscovery] Resized window HWND ${hwnd} to ${width}x${height}`);
    } else {
      console.warn(`[WindowDiscovery] SetWindowPos returned false for HWND ${hwnd}`);
    }
    return success;
  } catch (error) {
    console.error(`[WindowDiscovery] Error resizing window HWND ${hwnd}:`, error);
    return false;
  }
}

/**
 * Wait for a window to appear with a title containing the given string
 */
export async function waitForWindow(
  titleSubstring: string,
  timeoutMs: number = 30000,
  pollIntervalMs: number = 1000
): Promise<WindowInfo | null> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const windows = findWindowsByTitle(titleSubstring);
    if (windows.length > 0) {
      console.log(`[WindowDiscovery] Found window matching "${titleSubstring}": "${windows[0].title}"`);
      return windows[0];
    }
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
  }

  console.warn(`[WindowDiscovery] Timeout waiting for window: "${titleSubstring}"`);
  return null;
}

/**
 * Wait for a KTS-specific window to appear
 */
export async function waitForKTSWindow(
  titleSubstring: string,
  timeoutMs: number = 30000,
  pollIntervalMs: number = 1000
): Promise<WindowInfo | null> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const windows = findKTSWindows();
    const match = windows.find(w =>
      w.title.toLowerCase().includes(titleSubstring.toLowerCase())
    );
    if (match) {
      console.log(`[WindowDiscovery] Found KTS window matching "${titleSubstring}": "${match.title}"`);
      return match;
    }
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
  }

  console.warn(`[WindowDiscovery] Timeout waiting for KTS window: "${titleSubstring}"`);
  return null;
}

/**
 * Wait for multiple windows to appear
 */
export async function waitForWindows(
  titleSubstring: string,
  count: number,
  timeoutMs: number = 60000,
  pollIntervalMs: number = 2000
): Promise<WindowInfo[]> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const windows = findWindowsByTitle(titleSubstring);
    if (windows.length >= count) {
      console.log(`[WindowDiscovery] Found ${windows.length} windows matching "${titleSubstring}"`);
      return windows;
    }
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
  }

  const windows = findWindowsByTitle(titleSubstring);
  console.warn(`[WindowDiscovery] Timeout: found ${windows.length}/${count} windows matching "${titleSubstring}"`);
  return windows;
}

/**
 * Activate (bring to front and focus) a window by its HWND.
 * Uses Win32 SetForegroundWindow API via PowerShell.
 */
export function activateWindow(hwnd: number): boolean {
  if (!hwnd || hwnd === 0) {
    console.warn('[WindowDiscovery] Cannot activate window: invalid HWND');
    return false;
  }

  try {
    const script = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Win32Window {
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")]
    public static extern bool IsIconic(IntPtr hWnd);
}
"@
$hwnd = [IntPtr]::new(${hwnd})
# Restore if minimized
if ([Win32Window]::IsIconic($hwnd)) {
    [Win32Window]::ShowWindow($hwnd, 9) # SW_RESTORE
}
$result = [Win32Window]::SetForegroundWindow($hwnd)
Write-Output $result.ToString().ToLower()
`.trim();

    const output = runPsScript(script);
    const success = output.toLowerCase() === 'true';
    if (success) {
      console.log(`[WindowDiscovery] Activated window HWND ${hwnd}`);
    } else {
      console.warn(`[WindowDiscovery] SetForegroundWindow returned false for HWND ${hwnd}`);
    }
    return success;
  } catch (error) {
    console.error(`[WindowDiscovery] Error activating window HWND ${hwnd}:`, error);
    return false;
  }
}

/**
 * Virtual key code mapping for keyboard input.
 * Maps Playwright key names to Windows VK codes.
 */
const VK_CODES: Record<string, number> = {
  'Space': 0x20,
  'Enter': 0x0D,
  'Tab': 0x09,
  'Escape': 0x1B,
  'Backspace': 0x08,
  'Delete': 0x2E,
  'ArrowUp': 0x26,
  'ArrowDown': 0x28,
  'ArrowLeft': 0x25,
  'ArrowRight': 0x27,
  'Home': 0x24,
  'End': 0x23,
  'PageUp': 0x21,
  'PageDown': 0x22,
  'F1': 0x70, 'F2': 0x71, 'F3': 0x72, 'F4': 0x73,
  'F5': 0x74, 'F6': 0x75, 'F7': 0x76, 'F8': 0x77,
  'F9': 0x78, 'F10': 0x79, 'F11': 0x7A, 'F12': 0x7B,
  'Digit0': 0x30, 'Digit1': 0x31, 'Digit2': 0x32, 'Digit3': 0x33,
  'Digit4': 0x34, 'Digit5': 0x35, 'Digit6': 0x36, 'Digit7': 0x37,
  'Digit8': 0x38, 'Digit9': 0x39,
  'Numpad0': 0x60, 'Numpad1': 0x61, 'Numpad2': 0x62, 'Numpad3': 0x63,
  'Numpad4': 0x64, 'Numpad5': 0x65, 'Numpad6': 0x66, 'Numpad7': 0x67,
  'Numpad8': 0x68, 'Numpad9': 0x69,
  'KeyA': 0x41, 'KeyB': 0x42, 'KeyC': 0x43, 'KeyD': 0x44,
  'KeyE': 0x45, 'KeyF': 0x46, 'KeyG': 0x47, 'KeyH': 0x48,
  'KeyI': 0x49, 'KeyJ': 0x4A, 'KeyK': 0x4B, 'KeyL': 0x4C,
  'KeyM': 0x4D, 'KeyN': 0x4E, 'KeyO': 0x4F, 'KeyP': 0x50,
  'KeyQ': 0x51, 'KeyR': 0x52, 'KeyS': 0x53, 'KeyT': 0x54,
  'KeyU': 0x55, 'KeyV': 0x56, 'KeyW': 0x57, 'KeyX': 0x58,
  'KeyY': 0x59, 'KeyZ': 0x5A,
  'Shift': 0x10, 'Ctrl': 0x11, 'Alt': 0x12,
};

/**
 * Parse a key combination string (e.g., "Shift+KeyR") into VK code(s).
 */
function parseKeyCombo(keyString: string): { modifiers: number[]; key: number } {
  const parts = keyString.split('+');
  const modifiers: number[] = [];
  let key = 0;

  for (const part of parts) {
    const vk = VK_CODES[part];
    if (vk === undefined) {
      throw new Error(`Unknown key: ${part}`);
    }
    if (part === 'Shift' || part === 'Ctrl' || part === 'Alt') {
      modifiers.push(vk);
    } else {
      key = vk;
    }
  }

  return { modifiers, key };
}

/**
 * Send a keyboard input to a window using Win32 keybd_event API.
 * The window must be foreground (use activateWindow first).
 *
 * @param hwnd - Window handle
 * @param keyString - Playwright-style key string (e.g., "Space", "Digit8", "Shift+KeyR")
 */
export async function sendKeyToWindow(hwnd: number, keyString: string): Promise<void> {
  const { modifiers, key } = parseKeyCombo(keyString);

  const modLines = modifiers.map(vk =>
    `[Win32Keybd]::keybd_event([byte]${vk}, 0, 0, [UIntPtr]::Zero)`
  ).join('\n    ');
  const modUpLines = [...modifiers].reverse().map(vk =>
    `[Win32Keybd]::keybd_event([byte]${vk}, 0, 2, [UIntPtr]::Zero)`
  ).join('\n    ');

  const script = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Win32Keybd {
    [DllImport("user32.dll")]
    public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
}
"@

# Press modifiers down
${modLines || '# no modifiers'}

# Press and release the key
[Win32Keybd]::keybd_event([byte]${key}, 0, 0, [UIntPtr]::Zero)
Start-Sleep -Milliseconds 20
[Win32Keybd]::keybd_event([byte]${key}, 0, 2, [UIntPtr]::Zero)

# Release modifiers
${modUpLines || '# no modifiers'}

Write-Output "ok"
`.trim();

  try {
    runPsScript(script);
    console.log(`[WindowDiscovery] Sent key "${keyString}" (VK: 0x${key.toString(16).toUpperCase()})`);
  } catch (error) {
    console.error(`[WindowDiscovery] Error sending key "${keyString}":`, error);
    throw error;
  }
}
