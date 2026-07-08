import { test as base, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import { launchPortable, killProcess, type ProcessHandle } from '../desktop/launcher.js';
import {
  waitForKTSWindow,
  activateWindow,
  sendKeyToWindow,
  findKTSWindows,
  type WindowInfo,
} from '../desktop/window-discovery.js';
import { waitForAllServices } from '../desktop/wait-utilities.js';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Single executable: KTS is one app that creates multiple windows
const KTS_EXECUTABLE = path.resolve(
  __dirname,
  '../../../electron-app/build-output/win-unpacked/Kurash Scoreboard.exe'
);

const DEFAULT_PORTS = {
  mysql: 3406,
  http: 18000,
  websocket: 18080,
};

export interface KTSWorkflowContext {
  /** The main process handle */
  handle: ProcessHandle;
  /** Find the controller window (Gilam Controller) */
  getController: () => Promise<WindowInfo | null>;
  /** Find the scoreboard window (Kurash Scoreboard) */
  getScoreboard: () => Promise<WindowInfo | null>;
  /** Activate and send a key to a window */
  pressKey: (window: WindowInfo, key: string) => Promise<void>;
}

export interface KTSFixtures {
  /** The KTS application process */
  ktsProcess: ProcessHandle;
  /** The KTS workflow context */
  kts: KTSWorkflowContext;
}

/**
 * Shared test fixture for workflow tests.
 * Launches a single KTS app instance, waits for services,
 * and provides helpers for window interaction.
 */
export const test = base.extend<KTSFixtures>({
  ktsProcess: async ({}, use) => {
    // Kill any existing KTS processes first (single-instance app)
    try {
      const { execSync } = await import('child_process');
      execSync('taskkill /IM "Kurash Scoreboard.exe" /F /T', { stdio: 'pipe' });
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch {}

    // Verify executable exists
    if (!fs.existsSync(KTS_EXECUTABLE)) {
      throw new Error(`KTS executable not found: ${KTS_EXECUTABLE}`);
    }

    // Launch KTS
    console.log('[Fixture] Launching KTS:', KTS_EXECUTABLE);
    const result = await launchPortable({
      executablePath: KTS_EXECUTABLE,
      name: 'Kurash Tournament Suite',
      startupTimeout: 60000,
    });

    if (!result.started || !result.handle) {
      throw new Error(`Failed to launch KTS: ${result.error}`);
    }

    console.log(`[Fixture] KTS launched with PID ${result.handle.pid}`);

    // Wait for services
    console.log('[Fixture] Waiting for services...');
    const allReady = await waitForAllServices(DEFAULT_PORTS, { timeout: 60000 });
    if (!allReady) {
      throw new Error('Services failed to start within timeout');
    }
    console.log('[Fixture] All services ready');

    // Services are ready. KTS continues booting after services start.
    // Poll for windows to appear (up to 30s) instead of a fixed wait.
    console.log('[Fixture] Waiting for KTS windows to appear...');
    const windowWaitStart = Date.now();
    let controllerFound = false;
    while (Date.now() - windowWaitStart < 30000) {
      const windows = findKTSWindows();
      if (windows.length > 0) {
        console.log(`[Fixture] Found ${windows.length} KTS window(s):`, windows.map(w => `"${w.title}" (PID: ${w.processId})`).join(', '));
        controllerFound = true;
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    if (!controllerFound) {
      console.warn('[Fixture] No KTS windows found after 30s — tests may skip');
    }

    // Provide the handle to the test
    await use(result.handle);

    // Cleanup
    console.log('[Fixture] Cleaning up KTS...');
    killProcess(result.handle);
    console.log('[Fixture] KTS cleaned up');
  },

  kts: async ({ ktsProcess }, use) => {
    const context: KTSWorkflowContext = {
      handle: ktsProcess,

      getController: async () => {
        // The controller is the main KTS window found by Get-Process
        const windows = findKTSWindows();
        if (windows.length > 0) return windows[0];

        // Retry with polling
        for (let i = 0; i < 10; i++) {
          const w = await waitForKTSWindow('', 3000);
          if (w) return w;
        }
        return null;
      },

      getScoreboard: async () => {
        // Scoreboard is NOT created at startup — it's launched on-demand.
        // Only look for it if it exists.
        const windows = findKTSWindows();
        const scoreboard = windows.find(w =>
          w.title.toLowerCase().includes('scoreboard') ||
          w.title.toLowerCase().includes('live')
        );
        return scoreboard || null;
      },

      pressKey: async (window: WindowInfo, key: string) => {
        // Activate the window first
        activateWindow(window.hwnd);
        await new Promise(resolve => setTimeout(resolve, 200));
        // Send the key
        await sendKeyToWindow(window.hwnd, key);
      },
    };

    await use(context);
  },
});

export { expect, activateWindow, sendKeyToWindow };
