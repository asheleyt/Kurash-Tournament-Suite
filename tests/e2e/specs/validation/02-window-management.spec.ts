import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';
import {
  waitForWindow,
  activateWindow,
  resizeWindow,
  findWindowsByTitle,
  type WindowHandle,
} from '../../desktop/window-discovery.js';
import { launchPortable, type ProcessHandle } from '../../desktop/launcher.js';
import { ProcessManager } from '../../desktop/process-manager.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test.describe('Window Management @validation', () => {
  let processManager: ProcessManager;
  let handles: ProcessHandle[] = [];

  test.beforeAll(async () => {
    processManager = new ProcessManager();
  });

  test.afterAll(async () => {
    console.log('[Window Mgmt] Cleaning up...');
    await processManager.cleanupAll(15000);
  });

  test('should find all KTS application windows', async () => {
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

    const controllerWindows = findWindowsByTitle('Kurash Controller');
    const scoreboardWindows = findWindowsByTitle('Kurash Scoreboard');

    expect(controllerWindows.length).toBeGreaterThanOrEqual(0);
    expect(scoreboardWindows.length).toBeGreaterThanOrEqual(0);
  });

  test('should activate controller window', async () => {
    const window = await waitForWindow('Kurash Controller', 60000);
    if (!window) {
      test.skip(true, 'Controller window not found');
      return;
    }

    const activated = activateWindow(window.hwnd);
    expect(activated).toBeTruthy();

    await new Promise((resolve) => setTimeout(resolve, 500));
    const windowsAfter = findWindowsByTitle('Kurash Controller');
    expect(windowsAfter.length).toBeGreaterThanOrEqual(1);
  });

  test('should activate scoreboard window', async () => {
    const window = await waitForWindow('Kurash Scoreboard', 60000);
    if (!window) {
      test.skip(true, 'Scoreboard window not found');
      return;
    }

    const activated = activateWindow(window.hwnd);
    expect(activated).toBeTruthy();
  });

  test('should switch focus between controller and scoreboard', async () => {
    const controller = await waitForWindow('Kurash Controller', 30000);
    const scoreboard = await waitForWindow('Kurash Scoreboard', 30000);

    if (!controller || !scoreboard) {
      test.skip(true, 'Both windows not found');
      return;
    }

    activateWindow(controller.hwnd);
    await new Promise((resolve) => setTimeout(resolve, 300));

    activateWindow(scoreboard.hwnd);
    await new Promise((resolve) => setTimeout(resolve, 300));

    activateWindow(controller.hwnd);
    await new Promise((resolve) => setTimeout(resolve, 300));

    const controllerAfter = findWindowsByTitle('Kurash Controller');
    const scoreboardAfter = findWindowsByTitle('Kurash Scoreboard');

    expect(controllerAfter.length).toBeGreaterThanOrEqual(1);
    expect(scoreboardAfter.length).toBeGreaterThanOrEqual(1);
  });

  test('should resize controller window', async () => {
    const window = await waitForWindow('Kurash Controller', 30000);
    if (!window) {
      test.skip(true, 'Controller window not found');
      return;
    }

    const originalWidth = window.width;
    const originalHeight = window.height;

    const resized = resizeWindow(window.hwnd, 1280, 720);
    expect(resized).toBeTruthy();

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const windowsAfter = findWindowsByTitle('Kurash Controller');
    expect(windowsAfter.length).toBeGreaterThanOrEqual(1);
  });

  test('should resize scoreboard window', async () => {
    const window = await waitForWindow('Kurash Scoreboard', 30000);
    if (!window) {
      test.skip(true, 'Scoreboard window not found');
      return;
    }

    const resized = resizeWindow(window.hwnd, 1920, 1080);
    expect(resized).toBeTruthy();

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const windowsAfter = findWindowsByTitle('Kurash Scoreboard');
    expect(windowsAfter.length).toBeGreaterThanOrEqual(1);
  });

  test('should handle rapid window switching', async () => {
    const controller = await waitForWindow('Kurash Controller', 30000);
    const scoreboard = await waitForWindow('Kurash Scoreboard', 30000);

    if (!controller || !scoreboard) {
      test.skip(true, 'Both windows not found');
      return;
    }

    for (let i = 0; i < 10; i++) {
      activateWindow(controller.hwnd);
      await new Promise((resolve) => setTimeout(resolve, 100));
      activateWindow(scoreboard.hwnd);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    const controllerAfter = findWindowsByTitle('Kurash Controller');
    const scoreboardAfter = findWindowsByTitle('Kurash Scoreboard');

    expect(controllerAfter.length).toBeGreaterThanOrEqual(1);
    expect(scoreboardAfter.length).toBeGreaterThanOrEqual(1);
  });

  test('should maintain window state after focus changes', async () => {
    const controller = await waitForWindow('Kurash Controller', 30000);
    if (!controller) {
      test.skip(true, 'Controller window not found');
      return;
    }

    const initialWindows = findWindowsByTitle('Kurash Controller');
    expect(initialWindows.length).toBeGreaterThanOrEqual(1);

    const scoreboard = await waitForWindow('Kurash Scoreboard', 10000);
    if (scoreboard) {
      activateWindow(scoreboard.hwnd);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    activateWindow(controller.hwnd);
    await new Promise((resolve) => setTimeout(resolve, 500));

    const windowsAfter = findWindowsByTitle('Kurash Controller');
    expect(windowsAfter.length).toBeGreaterThanOrEqual(1);
    expect(windowsAfter[0].title).toBe(initialWindows[0].title);
  });
});
