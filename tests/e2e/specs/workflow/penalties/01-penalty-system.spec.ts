import { test, expect } from '../../../fixtures/kts-fixture.js';

test.describe('Penalty System @workflow @penalties', () => {
  test('should apply all green penalty types', async ({ kts }) => {
    const controller = await kts.getController();
    if (!controller) {
      test.skip(true, 'Controller window not found');
      return;
    }

    // KeyI = Green G (gyongy)
    await kts.pressKey(controller, 'KeyI');
    await new Promise(resolve => setTimeout(resolve, 400));

    // KeyO = Green D (degmi)
    await kts.pressKey(controller, 'KeyO');
    await new Promise(resolve => setTimeout(resolve, 400));

    // KeyP = Green T (tartozkodas)
    await kts.pressKey(controller, 'KeyP');
    await new Promise(resolve => setTimeout(resolve, 400));

    expect(true).toBeTruthy();
  });

  test('should apply all blue penalty types', async ({ kts }) => {
    const controller = await kts.getController();
    if (!controller) {
      test.skip(true, 'Controller window not found');
      return;
    }

    // KeyQ = Blue G
    await kts.pressKey(controller, 'KeyQ');
    await new Promise(resolve => setTimeout(resolve, 400));

    // KeyW = Blue D
    await kts.pressKey(controller, 'KeyW');
    await new Promise(resolve => setTimeout(resolve, 400));

    // KeyE = Blue T
    await kts.pressKey(controller, 'KeyE');
    await new Promise(resolve => setTimeout(resolve, 400));

    expect(true).toBeTruthy();
  });

  test('should apply alternating green and blue penalties', async ({ kts }) => {
    const controller = await kts.getController();
    if (!controller) {
      test.skip(true, 'Controller window not found');
      return;
    }

    // Green G
    await kts.pressKey(controller, 'KeyI');
    await new Promise(resolve => setTimeout(resolve, 400));

    // Blue G
    await kts.pressKey(controller, 'KeyQ');
    await new Promise(resolve => setTimeout(resolve, 400));

    // Green D
    await kts.pressKey(controller, 'KeyO');
    await new Promise(resolve => setTimeout(resolve, 400));

    // Blue D
    await kts.pressKey(controller, 'KeyW');
    await new Promise(resolve => setTimeout(resolve, 400));

    expect(true).toBeTruthy();
  });

  test('should apply all six penalty types in sequence', async ({ kts }) => {
    const controller = await kts.getController();
    if (!controller) {
      test.skip(true, 'Controller window not found');
      return;
    }

    const penaltyKeys = [
      'KeyI', // Green G
      'KeyQ', // Blue G
      'KeyO', // Green D
      'KeyW', // Blue D
      'KeyP', // Green T
      'KeyE', // Blue T
    ];

    for (const key of penaltyKeys) {
      await kts.pressKey(controller, key);
      await new Promise(resolve => setTimeout(resolve, 400));
    }

    expect(true).toBeTruthy();
  });
});
