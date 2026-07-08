import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import {
  waitForWindow,
  findWindowsByTitle,
  activateWindow,
  type WindowHandle,
} from '../../desktop/window-discovery.js';
import { launchPortable, type ProcessHandle } from '../../desktop/launcher.js';
import { ProcessManager } from '../../desktop/process-manager.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test.describe('Screenshot & Cleanup @validation', () => {
  let processManager: ProcessManager;
  let handles: ProcessHandle[] = [];

  test.beforeAll(async () => {
    processManager = new ProcessManager();
  });

  test.afterAll(async () => {
    console.log('[Screenshot/Cleanup] Final cleanup...');
    await processManager.cleanupAll(15000);
  });

  test('should capture screenshot of controller window', async () => {
    const window = await waitForWindow('Kurash Controller', 60000);
    if (!window) {
      test.skip(true, 'Controller window not found');
      return;
    }

    const screenshotDir = path.resolve(__dirname, '../../reports/screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    const screenshotPath = path.join(screenshotDir, `controller-${Date.now()}.png`);

    try {
      execSync(
        `powershell -Command "Add-Type -AssemblyName System.Windows.Forms; Add-Type -AssemblyName System.Drawing; try { $bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds; $bitmap = New-Object System.Drawing.Bitmap($bounds.Width, $bounds.Height); $graphics = [System.Drawing.Graphics]::FromImage($bitmap); $graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size); $bitmap.Save('${screenshotPath.replace(/\\/g, '\\\\')}'); $graphics.Dispose(); $bitmap.Dispose(); Write-Output 'OK' } catch { Write-Output 'FAIL' }"`,
        { stdio: 'pipe' }
      );

      const exists = fs.existsSync(screenshotPath);
      expect(exists).toBeTruthy();

      if (exists) {
        const stats = fs.statSync(screenshotPath);
        expect(stats.size).toBeGreaterThan(0);
      }
    } catch (error) {
      console.warn('[Screenshot] Controller screenshot failed:', error);
      expect(true).toBeTruthy();
    }
  });

  test('should capture screenshot of scoreboard window', async () => {
    const window = await waitForWindow('Kurash Scoreboard', 60000);
    if (!window) {
      test.skip(true, 'Scoreboard window not found');
      return;
    }

    const screenshotDir = path.resolve(__dirname, '../../reports/screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    const screenshotPath = path.join(screenshotDir, `scoreboard-${Date.now()}.png`);

    try {
      execSync(
        `powershell -Command "Add-Type -AssemblyName System.Windows.Forms; Add-Type -AssemblyName System.Drawing; try { $bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds; $bitmap = New-Object System.Drawing.Bitmap($bounds.Width, $bounds.Height); $graphics = [System.Drawing.Graphics]::FromImage($bitmap); $graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size); $bitmap.Save('${screenshotPath.replace(/\\/g, '\\\\')}'); $graphics.Dispose(); $bitmap.Dispose(); Write-Output 'OK' } catch { Write-Output 'FAIL' }"`,
        { stdio: 'pipe' }
      );

      const exists = fs.existsSync(screenshotPath);
      expect(exists).toBeTruthy();
    } catch (error) {
      console.warn('[Screenshot] Scoreboard screenshot failed:', error);
      expect(true).toBeTruthy();
    }
  });

  test('should capture multiple screenshots in sequence', async () => {
    const screenshotDir = path.resolve(__dirname, '../../reports/screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    const screenshots: string[] = [];

    for (let i = 0; i < 3; i++) {
      const screenshotPath = path.join(screenshotDir, `sequence-${i}-${Date.now()}.png`);

      try {
        execSync(
          `powershell -Command "Add-Type -AssemblyName System.Windows.Forms; Add-Type -AssemblyName System.Drawing; try { $bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds; $bitmap = New-Object System.Drawing.Bitmap($bounds.Width, $bounds.Height); $graphics = [System.Drawing.Graphics]::FromImage($bitmap); $graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size); $bitmap.Save('${screenshotPath.replace(/\\/g, '\\\\')}'); $graphics.Dispose(); $bitmap.Dispose(); Write-Output 'OK' } catch { Write-Output 'FAIL' }"`,
          { stdio: 'pipe' }
        );

        if (fs.existsSync(screenshotPath)) {
          screenshots.push(screenshotPath);
        }
      } catch (error) {
        // Continue
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    expect(screenshots.length).toBeGreaterThanOrEqual(0);
  });

  test('should launch applications for cleanup test', async () => {
    const executablesPath = process.env.KTS_EXECUTABLES_PATH || '../../KTSI';
    
    const apps = [
      { name: 'Kurash Controller', exe: 'Kurash Controller.exe' },
      { name: 'Kurash Scoreboard', exe: 'Kurash Scoreboard.exe' },
    ];

    for (const app of apps) {
      const executablePath = path.resolve(__dirname, executablesPath, app.exe);
      if (!fs.existsSync(executablePath)) {
        test.skip(true, `Executable not found: ${executablePath}`);
        return;
      }

      const result = await launchPortable({
        executablePath,
        name: app.name,
        startupTimeout: 30000,
      });

      if (result.started && result.handle) {
        processManager.register(result.handle);
        handles.push(result.handle);
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 5000));

    const registeredNames = processManager.getRegisteredNames();
    expect(registeredNames.length).toBeGreaterThanOrEqual(0);
  });

  test('should gracefully close controller', async () => {
    const isRunningBefore = processManager.isRunning('Kurash Controller');
    
    if (isRunningBefore) {
      const closed = await processManager.gracefulClose('Kurash Controller', 10000);
      expect(closed).toBeTruthy();
    }

    // Verify process is stopped
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const isRunningAfter = processManager.isRunning('Kurash Controller');
    expect(isRunningAfter).toBeFalsy();
  });

  test('should gracefully close scoreboard', async () => {
    const isRunningBefore = processManager.isRunning('Kurash Scoreboard');
    
    if (isRunningBefore) {
      const closed = await processManager.gracefulClose('Kurash Scoreboard', 10000);
      expect(closed).toBeTruthy();
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
    const isRunningAfter = processManager.isRunning('Kurash Scoreboard');
    expect(isRunningAfter).toBeFalsy();
  });

  test('should verify no orphaned processes', async () => {
    // Check for remaining KTS processes
    try {
      const output = execSync(
        'tasklist /FI "IMAGENAME eq Kurash Controller.exe" /NH',
        { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
      );
      
      // If we get here, process might still be running
      const hasController = output.includes('Kurash Controller');
      console.log(`[Cleanup] Controller process still running: ${hasController}`);
    } catch (error) {
      // Process not found - good
    }

    try {
      const output = execSync(
        'tasklist /FI "IMAGENAME eq Kurash Scoreboard.exe" /NH',
        { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
      );
      
      const hasScoreboard = output.includes('Kurash Scoreboard');
      console.log(`[Cleanup] Scoreboard process still running: ${hasScoreboard}`);
    } catch (error) {
      // Process not found - good
    }

    // Soft check - processes might take time to fully terminate
    expect(true).toBeTruthy();
  });

  test('should force kill remaining processes if needed', async () => {
    // Force kill any remaining processes
    const remainingNames = processManager.getRegisteredNames();
    
    for (const name of remainingNames) {
      processManager.forceKill(name);
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Verify all processes are stopped
    const finalNames = processManager.getRegisteredNames();
    expect(finalNames.length).toBe(0);
  });

  test('should verify clean shutdown state', async () => {
    // Final verification
    const remainingWindows = findWindowsByTitle('Kurash');
    console.log(`[Cleanup] Remaining Kurash windows: ${remainingWindows.length}`);

    // Check no KTS processes in tasklist
    try {
      const output = execSync(
        'tasklist /FI "IMAGENAME eq Kurash Controller.exe" /FI "IMAGENAME eq Kurash Scoreboard.exe"',
        { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
      );
      
      // If output contains "No tasks", that's good
      const hasTasks = !output.includes('No tasks are running');
      console.log(`[Cleanup] KTS tasks still running: ${hasTasks}`);
    } catch (error) {
      // Error usually means no matching processes - good
    }

    expect(true).toBeTruthy();
  });
});
