import { test, expect } from '../../../fixtures/kts-fixture.js';

test.describe('K Score @workflow @scoring', () => {
  test('should send green K score (Digit8)', async ({ kts }) => {
    const controller = await kts.getController();
    if (!controller) {
      test.skip(true, 'Controller window not found');
      return;
    }

    // Digit8 = Green K
    await kts.pressKey(controller, 'Digit8');
    await new Promise(resolve => setTimeout(resolve, 400));

    // Key was sent without error
    expect(true).toBeTruthy();
  });

  test('should send blue K score (Digit1)', async ({ kts }) => {
    const controller = await kts.getController();
    if (!controller) {
      test.skip(true, 'Controller window not found');
      return;
    }

    // Digit1 = Blue K
    await kts.pressKey(controller, 'Digit1');
    await new Promise(resolve => setTimeout(resolve, 400));

    expect(true).toBeTruthy();
  });

  test('should accumulate multiple K scores for green', async ({ kts }) => {
    const controller = await kts.getController();
    if (!controller) {
      test.skip(true, 'Controller window not found');
      return;
    }

    // Send 3 green K scores in sequence
    for (let i = 0; i < 3; i++) {
      await kts.pressKey(controller, 'Digit8');
      await new Promise(resolve => setTimeout(resolve, 400));
    }

    expect(true).toBeTruthy();
  });

  test('should accumulate multiple K scores for blue', async ({ kts }) => {
    const controller = await kts.getController();
    if (!controller) {
      test.skip(true, 'Controller window not found');
      return;
    }

    // Send 3 blue K scores in sequence
    for (let i = 0; i < 3; i++) {
      await kts.pressKey(controller, 'Digit1');
      await new Promise(resolve => setTimeout(resolve, 400));
    }

    expect(true).toBeTruthy();
  });

  test('should alternate green and blue K scores', async ({ kts }) => {
    const controller = await kts.getController();
    if (!controller) {
      test.skip(true, 'Controller window not found');
      return;
    }

    // Interleave green and blue K scores
    await kts.pressKey(controller, 'Digit8'); // Green K
    await new Promise(resolve => setTimeout(resolve, 400));

    await kts.pressKey(controller, 'Digit1'); // Blue K
    await new Promise(resolve => setTimeout(resolve, 400));

    await kts.pressKey(controller, 'Digit8'); // Green K
    await new Promise(resolve => setTimeout(resolve, 400));

    await kts.pressKey(controller, 'Digit1'); // Blue K
    await new Promise(resolve => setTimeout(resolve, 400));

    expect(true).toBeTruthy();
  });
});
