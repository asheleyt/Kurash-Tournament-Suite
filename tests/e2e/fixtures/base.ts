import { test as base, expect, type Page, type TestInfo } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import { launchPortable, type ProcessHandle, killAllProcesses } from '../desktop/launcher.js';
import { ProcessManager, getProcessManager } from '../desktop/process-manager.js';
import { waitForKTSWindow, activateWindow } from '../desktop/window-discovery.js';
import { waitForAllServices } from '../desktop/wait-utilities.js';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Single executable path
const KTS_EXECUTABLE = path.resolve(
  __dirname,
  '../../electron-app/build-output/win-unpacked/Kurash Scoreboard.exe'
);

export interface KTSFixtures {
  /** Launch and manage the application */
  application: {
    handle: ProcessHandle | null;
    processManager: ProcessManager;
  };
  /** Screenshot capture on failure */
  screenshotOnFailure: void;
}

export const test = base.extend<KTSFixtures>({
  application: async ({}, use, testInfo) => {
    const processManager = getProcessManager();

    if (!fs.existsSync(KTS_EXECUTABLE)) {
      throw new Error(`KTS executable not found: ${KTS_EXECUTABLE}`);
    }

    // Launch KTS
    console.log('[Fixture] Launching KTS application...');
    const result = await launchPortable({
      executablePath: KTS_EXECUTABLE,
      name: 'Kurash Tournament Suite',
      startupTimeout: 60000,
    });

    if (result.started && result.handle) {
      processManager.register(result.handle);
    }

    // Wait for services to be ready
    console.log('[Fixture] Waiting for services...');
    await waitForAllServices(
      { mysql: 3406, http: 18000, websocket: 18080 },
      { timeout: 90000 }
    );

    // Provide fixture values
    await use({
      handle: result.started ? result.handle : null,
      processManager,
    });

    // Cleanup
    console.log('[Fixture] Cleaning up...');
    await processManager.cleanupAll(10000);
  },

  screenshotOnFailure: async ({ page }, use, testInfo) => {
    await use();

    // Capture screenshot on failure
    if (testInfo.status !== testInfo.expectedStatus) {
      const screenshotDir = path.resolve(__dirname, '../reports/screenshots');
      if (!fs.existsSync(screenshotDir)) {
        fs.mkdirSync(screenshotDir, { recursive: true });
      }

      const screenshotPath = path.join(
        screenshotDir,
        `${testInfo.title.replace(/\s+/g, '-')}-${Date.now()}.png`
      );

      try {
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`[Fixture] Screenshot saved: ${screenshotPath}`);
      } catch (error) {
        console.error('[Fixture] Failed to capture screenshot:', error);
      }
    }
  },
});

export { expect };
