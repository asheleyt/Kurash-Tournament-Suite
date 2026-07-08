import { test, expect } from '../../../fixtures/kts-fixture.js';
import { findKTSWindows } from '../../../desktop/window-discovery.js';

/**
 * State-to-UI Label Mapping — Regression Tests (Electron)
 *
 * These tests verify that indicator state changes produce the correct
 * UI label changes. Since the Electron app doesn't expose a Playwright
 * Page, we verify the app remains responsive after state changes.
 *
 * Template reference: refereeController.template.html:2356-2360
 *   - isMedicMode → "MEDIC TIMER"
 *   - isBreakMode → "BREAK TIMER"
 *   - default     → "GAME TIMER"
 */
test.describe('Indicator Label Mapping @workflow @indicators @labels', () => {
  test('break toggle: app remains responsive', async ({ kts }) => {
    const controller = await kts.getController();
    if (!controller) {
      test.skip(true, 'Controller window not found');
      return;
    }

    // Toggle break on
    await kts.pressKey(controller, 'KeyB');
    await new Promise(resolve => setTimeout(resolve, 500));

    // Verify app is still responsive
    const windows = await findKTSWindows();
    expect(windows.length).toBeGreaterThan(0);

    // Toggle break off
    await kts.pressKey(controller, 'KeyB');
    await new Promise(resolve => setTimeout(resolve, 500));

    // Verify app is still responsive
    const windows2 = await findKTSWindows();
    expect(windows2.length).toBeGreaterThan(0);
  });

  test('medic toggle: app remains responsive', async ({ kts }) => {
    const controller = await kts.getController();
    if (!controller) {
      test.skip(true, 'Controller window not found');
      return;
    }

    // Toggle medic on (KeyL = green medic)
    await kts.pressKey(controller, 'KeyL');
    await new Promise(resolve => setTimeout(resolve, 500));

    // Verify app is still responsive
    const windows = await findKTSWindows();
    expect(windows.length).toBeGreaterThan(0);
  });

  test('jazo toggle: app remains responsive', async ({ kts }) => {
    const controller = await kts.getController();
    if (!controller) {
      test.skip(true, 'Controller window not found');
      return;
    }

    // Toggle jazo on
    await kts.pressKey(controller, 'KeyJ');
    await new Promise(resolve => setTimeout(resolve, 500));

    // Verify app is still responsive
    const windows = await findKTSWindows();
    expect(windows.length).toBeGreaterThan(0);
  });
});
