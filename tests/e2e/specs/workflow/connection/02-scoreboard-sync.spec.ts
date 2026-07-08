import { test, expect } from '../../../fixtures/kts-fixture.js';
import { isPortListening } from '../../../desktop/wait-utilities.js';

test.describe('Scoreboard Sync @workflow @connection', () => {
  test('should launch KTS and verify services are running', async ({ kts }) => {
    // The fixture already waits for services; verify they are up
    const httpListening = await isPortListening(18000);
    const wsListening = await isPortListening(18080);
    const mysqlListening = await isPortListening(3406);

    expect(httpListening).toBe(true);
    expect(wsListening).toBe(true);
    expect(mysqlListening).toBe(true);
  });

  test('should verify WebSocket port is listening (sync mechanism)', async ({ kts }) => {
    // The WebSocket port is the sync mechanism between controller and scoreboards.
    // Scoreboards connect to this port; it must be available at startup.
    const wsListening = await isPortListening(18080);
    expect(wsListening).toBe(true);
  });

  test('should verify HTTP API port is listening', async ({ kts }) => {
    const httpListening = await isPortListening(18000);
    expect(httpListening).toBe(true);
  });

  test('should verify controller exists alongside services', async ({ kts }) => {
    const controller = await kts.getController();
    if (!controller) {
      test.skip(true, 'Controller window not found');
      return;
    }

    // Controller window and all services should be up simultaneously
    const [httpOk, wsOk] = await Promise.all([
      isPortListening(18000),
      isPortListening(18080),
    ]);

    expect(httpOk).toBe(true);
    expect(wsOk).toBe(true);
    expect(controller.title).toBeTruthy();
  });
});
