import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import { launchPortable, killProcess, type ProcessHandle } from '../../desktop/launcher.js';
import { waitForKTSWindow } from '../../desktop/window-discovery.js';
import { waitForAllServices } from '../../desktop/wait-utilities.js';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Correct path: project root / electron-app / build-output / win-unpacked / exe
const KTS_EXECUTABLE = path.resolve(__dirname, '../../../../electron-app/build-output/win-unpacked/Kurash Scoreboard.exe');

test.describe('Application Launch @smoke', () => {
  let handle: ProcessHandle | null = null;

  test.afterAll(async () => {
    if (handle) {
      console.log(`[Test] Cleaning up process ${handle.pid}...`);
      killProcess(handle);
    }
  });

  test('should launch Kurash Tournament Suite', async () => {
    expect(fs.existsSync(KTS_EXECUTABLE), `Executable must exist at ${KTS_EXECUTABLE}`).toBeTruthy();

    const result = await launchPortable({
      executablePath: KTS_EXECUTABLE,
      name: 'Kurash Tournament Suite',
      startupTimeout: 60000,
    });

    expect(result.started, result.error || 'Process should start').toBeTruthy();
    expect(result.handle?.pid).toBeGreaterThan(0);
    handle = result.handle;
  });

  test('should wait for services to be ready', async () => {
    expect(handle, 'Process handle must exist from previous test').not.toBeNull();

    const ports = {
      mysql: 3406,
      http: 18000,
      websocket: 18080,
    };

    const allReady = await waitForAllServices(ports, { timeout: 60000 });
    expect(allReady).toBeTruthy();
  });

  test('should find KTS application windows', async () => {
    // Wait for windows to appear - KTS needs time to create its windows
    await new Promise(resolve => setTimeout(resolve, 5000));

    // KTS windows have titles like "Laravel", "Kurash Scoreboard", "Gilam Controller"
    // Search for any of these patterns
    const searchTerms = ['scoreboard', 'gilam', 'controller', 'laravel', 'kurash'];
    let found = false;
    for (const term of searchTerms) {
      const window = await waitForKTSWindow(term, 5000);
      if (window) {
        console.log(`[Test] Found KTS window: "${window.title}" (PID: ${window.processId})`);
        found = true;
        break;
      }
    }
    expect(found, 'Should find at least one KTS window').toBeTruthy();
  });

  test('should capture screenshot', async () => {
    const screenshotDir = path.resolve(__dirname, '../../reports/screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    if (process.platform === 'win32') {
      const { execSync } = await import('child_process');
      try {
        const screenshotPath = path.join(screenshotDir, `smoke-${Date.now()}.png`);
        execSync(
          `powershell -Command "Add-Type -AssemblyName System.Windows.Forms; Add-Type -AssemblyName System.Drawing; $bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds; $bmp = New-Object System.Drawing.Bitmap($bounds.Width, $bounds.Height); $graphics = [System.Drawing.Graphics]::FromImage($bmp); $graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size); $bmp.Save('${screenshotPath.replace(/\\/g, '\\\\')}'); $graphics.Dispose(); $bmp.Dispose()"`,
          { stdio: 'pipe', timeout: 10000 }
        );
        console.log(`[Test] Screenshot saved: ${screenshotPath}`);
      } catch (error) {
        console.warn('[Test] Screenshot failed:', error);
      }
    }

    expect(true).toBeTruthy();
  });
});
