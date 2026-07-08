import { expect, type Page, type Locator } from '@playwright/test';
import { Timer, Score, Indicator } from './selectors.js';

/**
 * Assert timer is in expected state
 */
export async function assertTimerState(
  page: Page,
  expectedState: 'running' | 'paused' | 'stopped'
): Promise<void> {
  const timerDisplay = Timer.display(page);
  await expect(timerDisplay).toBeVisible();

  if (expectedState === 'running') {
    const runningIndicator = Timer.runningIndicator(page);
    await expect(runningIndicator).toBeVisible();
  } else if (expectedState === 'paused') {
    const pausedIndicator = Timer.pausedIndicator(page);
    await expect(pausedIndicator).toBeVisible();
  }
}

/**
 * Assert score matches expected value
 */
export async function assertScore(
  page: Page,
  side: 'green' | 'blue',
  expectedScore: number
): Promise<void> {
  const scoreElement = Score.bySide(page, side);
  await expect(scoreElement).toBeVisible();
  const actualScore = await scoreElement.textContent();
  expect(parseInt(actualScore || '0')).toBe(expectedScore);
}

/**
 * Assert indicator visibility
 */
export async function assertIndicator(
  page: Page,
  indicator: 'break' | 'jazo' | 'medic',
  visible: boolean
): Promise<void> {
  const indicatorElement = Indicator[indicator](page);

  if (visible) {
    await expect(indicatorElement).toBeVisible();
  } else {
    await expect(indicatorElement).not.toBeVisible();
  }
}

/**
 * Assert dialog is visible
 */
export async function assertDialogVisible(
  page: Page,
  dialogType: 'resetTimer' | 'resetMatch'
): Promise<void> {
  const dialog = dialogType === 'resetTimer'
    ? page.getByRole('dialog').filter({ hasText: 'Reset Timer' })
    : page.getByRole('dialog').filter({ hasText: 'Reset Match' });

  await expect(dialog).toBeVisible();
}

/**
 * Assert connection status
 */
export async function assertConnected(page: Page): Promise<void> {
  const status = page.getByText(/connected/i).first();
  await expect(status).toBeVisible();
}
