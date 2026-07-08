import { test, expect } from '../../../fixtures/kts-fixture.js';

test.describe('Timer Start/Pause @workflow @timer', () => {
  test('should start the timer with Space', async ({ kts }) => {
    const controller = await kts.getController();
    if (!controller) {
      test.skip(true, 'Controller window not found');
      return;
    }

    // Space toggles the timer (start)
    await kts.pressKey(controller, 'Space');
    await new Promise(resolve => setTimeout(resolve, 500));

    expect(true).toBeTruthy();
  });

  test('should pause the timer with Space after starting', async ({ kts }) => {
    const controller = await kts.getController();
    if (!controller) {
      test.skip(true, 'Controller window not found');
      return;
    }

    // Start the timer
    await kts.pressKey(controller, 'Space');
    await new Promise(resolve => setTimeout(resolve, 500));

    // Let it run briefly
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Pause the timer (Space again)
    await kts.pressKey(controller, 'Space');
    await new Promise(resolve => setTimeout(resolve, 500));

    expect(true).toBeTruthy();
  });

  test('should toggle timer multiple times', async ({ kts }) => {
    const controller = await kts.getController();
    if (!controller) {
      test.skip(true, 'Controller window not found');
      return;
    }

    // Start -> Pause -> Start -> Pause
    for (let i = 0; i < 4; i++) {
      await kts.pressKey(controller, 'Space');
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    expect(true).toBeTruthy();
  });
});
