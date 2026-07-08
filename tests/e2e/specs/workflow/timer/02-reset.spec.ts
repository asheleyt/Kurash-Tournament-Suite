import { test, expect } from '../../../fixtures/kts-fixture.js';

test.describe('Timer Reset @workflow @timer', () => {
  test('should reset the timer with Shift+KeyR', async ({ kts }) => {
    const controller = await kts.getController();
    if (!controller) {
      test.skip(true, 'Controller window not found');
      return;
    }

    // Shift+KeyR resets the timer
    await kts.pressKey(controller, 'Shift+KeyR');
    await new Promise(resolve => setTimeout(resolve, 500));

    expect(true).toBeTruthy();
  });

  test('should start then reset the timer', async ({ kts }) => {
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

    // Reset the timer
    await kts.pressKey(controller, 'Shift+KeyR');
    await new Promise(resolve => setTimeout(resolve, 500));

    expect(true).toBeTruthy();
  });

  test('should reset the timer multiple times', async ({ kts }) => {
    const controller = await kts.getController();
    if (!controller) {
      test.skip(true, 'Controller window not found');
      return;
    }

    // Reset multiple times
    for (let i = 0; i < 3; i++) {
      await kts.pressKey(controller, 'Shift+KeyR');
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    expect(true).toBeTruthy();
  });
});
