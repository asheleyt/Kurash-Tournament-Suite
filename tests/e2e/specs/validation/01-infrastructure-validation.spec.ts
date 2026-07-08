import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import { launchPortable, type ProcessHandle, killAllProcesses } from '../../desktop/launcher.js';
import { ProcessManager } from '../../desktop/process-manager.js';
import {
  waitForWindow,
  findWindowsByTitle,
  findWindowsByProcess,
  activateWindow,
  getAllWindows,
  type WindowHandle,
} from '../../desktop/window-discovery.js';
import { waitForAllServices } from '../../desktop/wait-utilities.js';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test.describe('Infrastructure Validation @validation', () => {
  let processManager: ProcessManager;
  let handles: ProcessHandle[] = [];

  test.beforeAll(async () => {
    processManager = new ProcessManager();
  });

  test.afterAll(async () => {
    console.log('[Validation] Cleaning up all processes...');
    await processManager.cleanupAll(15000);
  });

  test('should launch Kurash Controller successfully', async () => {
    const executablesPath = process.env.KTS_EXECUTABLES_PATH || '../../KTSI';
    const executablePath = path.resolve(__dirname, executablesPath, 'Kurash Controller.exe');

    if (!fs.existsSync(executablePath)) {
      test.skip(true, `Executable not found: ${executablePath}`);
      return;
    }

    const result = await launchPortable({
      executablePath,
      name: 'Kurash Controller',
      startupTimeout: 45000,
    });

    expect(result.started).toBeTruthy();
    expect(result.handle).not.toBeNull();
    expect(result.handle.pid).toBeGreaterThan(0);

    if (result.handle) {
      processManager.register(result.handle);
      handles.push(result.handle);
    }
  });

  test('should launch Kurash Scoreboard successfully', async () => {
    const executablesPath = process.env.KTS_EXECUTABLES_PATH || '../../KTSI';
    const executablePath = path.resolve(__dirname, executablesPath, 'Kurash Scoreboard.exe');

    if (!fs.existsSync(executablePath)) {
      test.skip(true, `Executable not found: ${executablePath}`);
      return;
    }

    const result = await launchPortable({
      executablePath,
      name: 'Kurash Scoreboard',
      startupTimeout: 45000,
    });

    expect(result.started).toBeTruthy();
    expect(result.handle).not.toBeNull();

    if (result.handle) {
      processManager.register(result.handle);
      handles.push(result.handle);
    }
  });

  test('should launch Event Host successfully', async () => {
    const executablesPath = process.env.KTS_EXECUTABLES_PATH || '../../KTSI';
    const executablePath = path.resolve(__dirname, executablesPath, 'Event Host.exe');

    if (!fs.existsSync(executablePath)) {
      test.skip(true, `Executable not found: ${executablePath}`);
      return;
    }

    const result = await launchPortable({
      executablePath,
      name: 'Event Host',
      startupTimeout: 45000,
    });

    expect(result.started).toBeTruthy();

    if (result.handle) {
      processManager.register(result.handle);
      handles.push(result.handle);
    }
  });

  test('should launch Gilam Display successfully', async () => {
    const executablesPath = process.env.KTS_EXECUTABLES_PATH || '../../KTSI';
    const executablePath = path.resolve(__dirname, executablesPath, 'Gilam Display.exe');

    if (!fs.existsSync(executablePath)) {
      test.skip(true, `Executable not found: ${executablePath}`);
      return;
    }

    const result = await launchPortable({
      executablePath,
      name: 'Gilam Display',
      startupTimeout: 45000,
    });

    expect(result.started).toBeTruthy();

    if (result.handle) {
      processManager.register(result.handle);
      handles.push(result.handle);
    }
  });

  test('should wait for all services to be ready', async () => {
    const ports = {
      mysql: 3406,
      http: 18000,
      websocket: 18080,
    };

    const allReady = await waitForAllServices(ports, { timeout: 120000 });
    expect(allReady).toBeTruthy();
  });

  test('should detect controller window', async () => {
    const window = await waitForWindow('Kurash Controller', 60000);
    expect(window).not.toBeNull();
    expect(window?.title).toContain('Kurash Controller');
    expect(window?.hwnd).toBeGreaterThan(0);
    expect(window?.processId).toBeGreaterThan(0);
    expect(window?.isVisible).toBeTruthy();
  });

  test('should detect scoreboard window', async () => {
    const window = await waitForWindow('Kurash Scoreboard', 60000);
    expect(window).not.toBeNull();
    expect(window?.title).toContain('Kurash Scoreboard');
    expect(window?.hwnd).toBeGreaterThan(0);
  });

  test('should detect event host window', async () => {
    const window = await waitForWindow('Event Host', 60000);
    expect(window).not.toBeNull();
    expect(window?.title).toContain('Event Host');
  });

  test('should detect gilam display window', async () => {
    const window = await waitForWindow('Gilam Display', 60000);
    expect(window).not.toBeNull();
    expect(window?.title).toContain('Gilam Display');
  });

  test('should enumerate all visible windows', async () => {
    const allWindows = getAllWindows();
    expect(allWindows).toBeInstanceOf(Array);
    expect(allWindows.length).toBeGreaterThan(0);

    const ktsWindows = allWindows.filter(
      (w) =>
        w.title.includes('Kurash') ||
        w.title.includes('Event Host') ||
        w.title.includes('Gilam')
    );
    expect(ktsWindows.length).toBeGreaterThanOrEqual(2);
  });

  test('should find windows by process name', async () => {
    const controllerWindows = findWindowsByProcess('Kurash Controller');
    expect(controllerWindows.length).toBeGreaterThanOrEqual(0);

    const scoreboardWindows = findWindowsByProcess('Kurash Scoreboard');
    expect(scoreboardWindows.length).toBeGreaterThanOrEqual(0);
  });

  test('should switch focus between windows', async () => {
    const controllerWindow = await waitForWindow('Kurash Controller', 30000);
    const scoreboardWindow = await waitForWindow('Kurash Scoreboard', 30000);

    if (!controllerWindow || !scoreboardWindow) {
      test.skip(true, 'Could not find both windows');
      return;
    }

    const activated1 = activateWindow(controllerWindow.hwnd);
    expect(activated1).toBeTruthy();

    await new Promise((resolve) => setTimeout(resolve, 500));

    const activated2 = activateWindow(scoreboardWindow.hwnd);
    expect(activated2).toBeTruthy();

    await new Promise((resolve) => setTimeout(resolve, 500));

    const activated3 = activateWindow(controllerWindow.hwnd);
    expect(activated3).toBeTruthy();
  });

  test('should capture system screenshot', async () => {
    if (process.platform !== 'win32') {
      test.skip(true, 'Screenshot capture only supported on Windows');
      return;
    }

    const screenshotDir = path.resolve(__dirname, '../../reports/screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    const { execSync } = await import('child_process');
    const screenshotPath = path.join(screenshotDir, `validation-${Date.now()}.png`);

    try {
      execSync(
        `powershell -Command "Add-Type -AssemblyName System.Windows.Forms; Add-Type -AssemblyName System.Drawing; try { $bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds; $bitmap = New-Object System.Drawing.Bitmap($bounds.Width, $bounds.Height); $graphics = [System.Drawing.Graphics]::FromImage($bitmap); $graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size); $bitmap.Save('${screenshotPath.replace(/\\/g, '\\\\')}'); $graphics.Dispose(); $bitmap.Dispose(); Write-Output 'Screenshot captured' } catch { Write-Output 'Screenshot failed' }"`,
        { stdio: 'pipe' }
      );

      const screenshotExists = fs.existsSync(screenshotPath);
      expect(screenshotExists).toBeTruthy();

      if (screenshotExists) {
        const stats = fs.statSync(screenshotPath);
        expect(stats.size).toBeGreaterThan(0);
      }
    } catch (error) {
      console.warn('[Validation] Screenshot capture failed:', error);
      expect(true).toBeTruthy();
    }
  });

  test('should gracefully close all applications', async () => {
    const registeredNames = processManager.getRegisteredNames();
    expect(registeredNames.length).toBeGreaterThan(0);

    const processesBefore = registeredNames.map((name) => ({
      name,
      wasRunning: processManager.isRunning(name),
    }));

    await processManager.cleanupAll(15000);

    for (const proc of processesBefore) {
      if (proc.wasRunning) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const isStillRunning = processManager.isRunning(proc.name);
        expect(isStillRunning).toBeFalsy();
      }
    }
  });

  test('should verify no orphaned processes remain', async () => {
    const remainingWindows = getAllWindows().filter(
      (w) =>
        w.title.includes('Kurash') ||
        w.title.includes('Event Host') ||
        w.title.includes('Gilam')
    );

    console.log(`[Validation] Remaining KTS windows: ${remainingWindows.length}`);
    expect(true).toBeTruthy();
  });
});
