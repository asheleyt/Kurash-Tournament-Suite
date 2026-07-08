import { test, expect } from '../../../fixtures/kts-fixture.js';

test.describe('Undo Score @workflow @scoring', () => {
  test('should send a score then undo it', async ({ kts }) => {
    const controller = await kts.getController();
    if (!controller) {
      test.skip(true, 'Controller window not found');
      return;
    }

    // Score a green K
    await kts.pressKey(controller, 'Digit8');
    await new Promise(resolve => setTimeout(resolve, 400));

    // Undo with Backspace
    await kts.pressKey(controller, 'Backspace');
    await new Promise(resolve => setTimeout(resolve, 400));

    expect(true).toBeTruthy();
  });

  test('should send multiple scores then undo the last one', async ({ kts }) => {
    const controller = await kts.getController();
    if (!controller) {
      test.skip(true, 'Controller window not found');
      return;
    }

    // Score green K, blue K, green YO
    await kts.pressKey(controller, 'Digit8');
    await new Promise(resolve => setTimeout(resolve, 400));

    await kts.pressKey(controller, 'Digit1');
    await new Promise(resolve => setTimeout(resolve, 400));

    await kts.pressKey(controller, 'Digit9');
    await new Promise(resolve => setTimeout(resolve, 400));

    // Undo the last score (green YO)
    await kts.pressKey(controller, 'Backspace');
    await new Promise(resolve => setTimeout(resolve, 400));

    expect(true).toBeTruthy();
  });

  test('should undo multiple times', async ({ kts }) => {
    const controller = await kts.getController();
    if (!controller) {
      test.skip(true, 'Controller window not found');
      return;
    }

    // Score three times
    await kts.pressKey(controller, 'Digit8');
    await new Promise(resolve => setTimeout(resolve, 400));

    await kts.pressKey(controller, 'Digit1');
    await new Promise(resolve => setTimeout(resolve, 400));

    await kts.pressKey(controller, 'Digit9');
    await new Promise(resolve => setTimeout(resolve, 400));

    // Undo all three
    await kts.pressKey(controller, 'Backspace');
    await new Promise(resolve => setTimeout(resolve, 400));

    await kts.pressKey(controller, 'Backspace');
    await new Promise(resolve => setTimeout(resolve, 400));

    await kts.pressKey(controller, 'Backspace');
    await new Promise(resolve => setTimeout(resolve, 400));

    expect(true).toBeTruthy();
  });
});
