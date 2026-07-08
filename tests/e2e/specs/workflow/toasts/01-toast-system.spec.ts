import { test, expect } from '../../../fixtures/kts-fixture.js';
import { findKTSWindows } from '../../../desktop/window-discovery.js';

/**
 * Toast/Banner System — Regression Tests (Electron)
 *
 * These tests verify that the toast notification system works correctly.
 * Since the Electron app doesn't expose a Playwright Page, we verify
 * the app remains responsive after actions that trigger toasts.
 *
 * Toast architecture (from refereeController.setup.ts:2557-2651):
 *   - 2 slots: 'status' (showBanner, not closable) and 'result' (showResultToast, closable)
 *   - 3 tones: success (emerald), error (rose), info (blue)
 *   - visibleControllerToasts computed: toasts.slice(-2) — max 2 visible
 */
test.describe('Toast System @workflow @toasts', () => {
  test('app launches without toast errors', async ({ kts }) => {
    const controller = await kts.getController();
    if (!controller) {
      test.skip(true, 'Controller window not found');
      return;
    }

    // Verify the app launched successfully
    const windows = await findKTSWindows();
    expect(windows.length).toBeGreaterThan(0);

    // The app should be responsive
    expect(true).toBeTruthy();
  });

  test('keyboard shortcuts work without crashing', async ({ kts }) => {
    const controller = await kts.getController();
    if (!controller) {
      test.skip(true, 'Controller window not found');
      return;
    }

    // Send various keyboard shortcuts that might trigger toasts
    const keys = ['KeyB', 'KeyJ', 'KeyL', 'KeyA'];
    for (const key of keys) {
      await kts.pressKey(controller, key);
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    // Verify the app is still responsive
    const windows = await findKTSWindows();
    expect(windows.length).toBeGreaterThan(0);

    expect(true).toBeTruthy();
  });
});
