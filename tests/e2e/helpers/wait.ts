import { type Page } from '@playwright/test';

/**
 * Wait for score to update on page
 */
export async function waitForScoreUpdate(
  page: Page,
  expectedScore: number,
  timeout = 5000
): Promise<void> {
  await page.waitForFunction(
    (expected) => {
      const scoreElements = document.querySelectorAll('.text-6xl');
      for (const el of Array.from(scoreElements)) {
        if (parseInt(el.textContent || '0') === expected) {
          return true;
        }
      }
      return false;
    },
    expectedScore,
    { timeout }
  );
}

/**
 * Wait for timer to reach specific value
 */
export async function waitForTimerValue(
  page: Page,
  expectedMinutes: number,
  expectedSeconds: number,
  timeout = 5000
): Promise<void> {
  const expected = `${String(expectedMinutes).padStart(2, '0')}:${String(expectedSeconds).padStart(2, '0')}`;

  await page.waitForFunction(
    (exp) => {
      const timerEl = document.querySelector('.text-7xl');
      return timerEl?.textContent?.trim() === exp;
    },
    expected,
    { timeout }
  );
}

/**
 * Wait for WebSocket connection
 */
export async function waitForWebSocketConnection(
  page: Page,
  timeout = 10000
): Promise<void> {
  await page.waitForFunction(
    () => {
      return !!(window as any).Echo?.connector?.socket?.connected;
    },
    { timeout }
  );
}

/**
 * Wait for page to be idle (no pending requests)
 */
export async function waitForPageIdle(
  page: Page,
  timeout = 5000
): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout });
}
