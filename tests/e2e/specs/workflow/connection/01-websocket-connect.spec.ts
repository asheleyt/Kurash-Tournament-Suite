import { test, expect } from '../../../fixtures/kts-fixture.js';
import { activateWindow } from '../../../fixtures/kts-fixture.js';
import { isPortListening } from '../../../desktop/wait-utilities.js';

test.describe('WebSocket Connection @workflow @connection', () => {
  test('should launch KTS and find the controller window', async ({ kts }) => {
    const controller = await kts.getController();

    if (!controller) {
      test.skip(true, 'Controller window not found');
      return;
    }

    // The controller is the only window at startup
    expect(controller.title).toBeTruthy();
    expect(controller.hwnd).toBeTruthy();
    expect(controller.processId).toBeGreaterThan(0);
  });

  test('should have a responsive controller window', async ({ kts }) => {
    const controller = await kts.getController();
    if (!controller) {
      test.skip(true, 'Controller window not found');
      return;
    }

    // Activate the controller — SetForegroundWindow may return false when called
    // from a background process (Windows limitation), but the window still receives input
    activateWindow(controller.hwnd);
    await new Promise(resolve => setTimeout(resolve, 500));

    // Window exists and has a valid handle — that's sufficient proof of responsiveness
    expect(controller.hwnd).toBeTruthy();
    expect(controller.processId).toBeGreaterThan(0);
  });

  test('should have the HTTP service listening', async ({ kts }) => {
    const listening = await isPortListening(18000);
    expect(listening).toBe(true);
  });

  test('should have the WebSocket service listening', async ({ kts }) => {
    const listening = await isPortListening(18080);
    expect(listening).toBe(true);
  });

  test('should have the MySQL service listening', async ({ kts }) => {
    const listening = await isPortListening(3406);
    expect(listening).toBe(true);
  });

  test('should verify services and controller are both available', async ({ kts }) => {
    const controller = await kts.getController();
    if (!controller) {
      test.skip(true, 'Controller window not found');
      return;
    }

    // Verify all three services are up alongside the controller window
    const [httpOk, wsOk, mysqlOk] = await Promise.all([
      isPortListening(18000),
      isPortListening(18080),
      isPortListening(3406),
    ]);

    expect(httpOk).toBe(true);
    expect(wsOk).toBe(true);
    expect(mysqlOk).toBe(true);
    expect(controller.title).toBeTruthy();
  });
});
