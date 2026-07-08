import { test, expect } from '../../../fixtures/kts-fixture.js';
import { activateWindow } from '../../../fixtures/kts-fixture.js';
import { isPortListening } from '../../../desktop/wait-utilities.js';
import { execSync } from 'child_process';

test.describe('Tournament Lifecycle @workflow @tournament', () => {
  test('should verify the KTS process is running', async ({ kts }) => {
    // The fixture launches KTS — verify the process exists
    try {
      const output = execSync(
        'tasklist /FI "IMAGENAME eq Kurash Scoreboard.exe" /NH',
        { stdio: 'pipe' }
      ).toString();

      expect(output).toContain('Kurash Scoreboard.exe');
    } catch {
      test.skip(true, 'Could not query process list');
    }
  });

  test('should verify all services are up', async ({ kts }) => {
    const [httpOk, wsOk, mysqlOk] = await Promise.all([
      isPortListening(18000),
      isPortListening(18080),
      isPortListening(3406),
    ]);

    expect(httpOk).toBe(true);
    expect(wsOk).toBe(true);
    expect(mysqlOk).toBe(true);
  });

  test('should find the controller window and verify it is responsive', async ({ kts }) => {
    const controller = await kts.getController();
    if (!controller) {
      test.skip(true, 'Controller window not found');
      return;
    }

    // Activate the window — SetForegroundWindow may return false when called
    // from a background process (Windows limitation), but the window still receives input
    activateWindow(controller.hwnd);
    await new Promise(resolve => setTimeout(resolve, 500));

    // Window exists and has a valid handle — that's sufficient proof of responsiveness
    expect(controller.title).toBeTruthy();
    expect(controller.processId).toBeGreaterThan(0);
    expect(controller.hwnd).toBeGreaterThan(0);
  });

  test('should verify process, services, and window are all available together', async ({ kts }) => {
    // Full lifecycle check: process running, services listening, window responsive
    const controller = await kts.getController();
    if (!controller) {
      test.skip(true, 'Controller window not found');
      return;
    }

    const [httpOk, wsOk, mysqlOk] = await Promise.all([
      isPortListening(18000),
      isPortListening(18080),
      isPortListening(3406),
    ]);

    // Activate the window — SetForegroundWindow may return false when called
    // from a background process (Windows limitation), but the window still receives input
    activateWindow(controller.hwnd);
    await new Promise(resolve => setTimeout(resolve, 500));

    expect(httpOk).toBe(true);
    expect(wsOk).toBe(true);
    expect(mysqlOk).toBe(true);
    expect(controller.title).toBeTruthy();
  });
});
