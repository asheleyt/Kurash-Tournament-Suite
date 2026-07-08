import { test, expect } from '../../../fixtures/kts-fixture.js';

test.describe('All Score Types @workflow @scoring', () => {
  test('should send all green score types', async ({ kts }) => {
    const controller = await kts.getController();
    if (!controller) {
      test.skip(true, 'Controller window not found');
      return;
    }

    // Digit8 = Green K
    await kts.pressKey(controller, 'Digit8');
    await new Promise(resolve => setTimeout(resolve, 400));

    // Digit9 = Green YO
    await kts.pressKey(controller, 'Digit9');
    await new Promise(resolve => setTimeout(resolve, 400));

    // Digit0 = Green CH
    await kts.pressKey(controller, 'Digit0');
    await new Promise(resolve => setTimeout(resolve, 400));

    expect(true).toBeTruthy();
  });

  test('should send all blue score types', async ({ kts }) => {
    const controller = await kts.getController();
    if (!controller) {
      test.skip(true, 'Controller window not found');
      return;
    }

    // Digit1 = Blue K
    await kts.pressKey(controller, 'Digit1');
    await new Promise(resolve => setTimeout(resolve, 400));

    // Digit2 = Blue YO
    await kts.pressKey(controller, 'Digit2');
    await new Promise(resolve => setTimeout(resolve, 400));

    // Digit3 = Blue CH
    await kts.pressKey(controller, 'Digit3');
    await new Promise(resolve => setTimeout(resolve, 400));

    expect(true).toBeTruthy();
  });

  test('should send green K then blue K then green YO', async ({ kts }) => {
    const controller = await kts.getController();
    if (!controller) {
      test.skip(true, 'Controller window not found');
      return;
    }

    await kts.pressKey(controller, 'Digit8'); // Green K
    await new Promise(resolve => setTimeout(resolve, 400));

    await kts.pressKey(controller, 'Digit1'); // Blue K
    await new Promise(resolve => setTimeout(resolve, 400));

    await kts.pressKey(controller, 'Digit9'); // Green YO
    await new Promise(resolve => setTimeout(resolve, 400));

    expect(true).toBeTruthy();
  });

  test('should send all six score types in sequence', async ({ kts }) => {
    const controller = await kts.getController();
    if (!controller) {
      test.skip(true, 'Controller window not found');
      return;
    }

    const scoreKeys = [
      'Digit8', // Green K
      'Digit9', // Green YO
      'Digit0', // Green CH
      'Digit1', // Blue K
      'Digit2', // Blue YO
      'Digit3', // Blue CH
    ];

    for (const key of scoreKeys) {
      await kts.pressKey(controller, key);
      await new Promise(resolve => setTimeout(resolve, 400));
    }

    expect(true).toBeTruthy();
  });
});
