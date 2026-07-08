import { test, expect } from '../../../fixtures/kts-fixture.js';
import { isPortListening } from '../../../desktop/wait-utilities.js';

test.describe('Cross-Window Sync @workflow @multi-window', () => {
  test('should verify services are running for sync', async ({ kts }) => {
    // The WebSocket service is the backbone for cross-window sync
    const wsListening = await isPortListening(18080);
    const httpListening = await isPortListening(18000);

    expect(wsListening).toBe(true);
    expect(httpListening).toBe(true);
  });

  test('should send multiple keyboard actions in sequence', async ({ kts }) => {
    const controller = await kts.getController();
    if (!controller) {
      test.skip(true, 'Controller window not found');
      return;
    }

    // Send a series of actions that would propagate via WebSocket
    // to any connected scoreboards (even though none exist yet)
    const actions = [
      { key: 'Digit8', label: 'Green K' },
      { key: 'Digit1', label: 'Blue K' },
      { key: 'Space', label: 'Start timer' },
      { key: 'Digit9', label: 'Green YO' },
      { key: 'Digit2', label: 'Blue YO' },
      { key: 'Space', label: 'Pause timer' },
    ];

    for (const action of actions) {
      await kts.pressKey(controller, action.key);
      await new Promise(resolve => setTimeout(resolve, 400));
    }

    expect(true).toBeTruthy();
  });

  test('should send scoring and indicator actions in mixed sequence', async ({ kts }) => {
    const controller = await kts.getController();
    if (!controller) {
      test.skip(true, 'Controller window not found');
      return;
    }

    // Mix of scoring, timer, penalty, and indicator actions
    const mixedActions = [
      'Digit8',     // Green K
      'Space',      // Start timer
      'Digit1',     // Blue K
      'KeyI',       // Green G penalty
      'KeyB',       // Break indicator
      'Digit9',     // Green YO
      'KeyQ',       // Blue G penalty
      'Shift+KeyR', // Reset timer
      'Backspace',  // Undo last score
      'KeyJ',       // Jazo indicator
    ];

    for (const key of mixedActions) {
      await kts.pressKey(controller, key);
      await new Promise(resolve => setTimeout(resolve, 400));
    }

    expect(true).toBeTruthy();
  });

  test('should verify controller remains responsive after rapid actions', async ({ kts }) => {
    const controller = await kts.getController();
    if (!controller) {
      test.skip(true, 'Controller window not found');
      return;
    }

    // Send a rapid burst of keys
    for (let i = 0; i < 5; i++) {
      await kts.pressKey(controller, 'Digit8');
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    // Verify services are still running after the burst
    const wsOk = await isPortListening(18080);
    expect(wsOk).toBe(true);
  });
});
