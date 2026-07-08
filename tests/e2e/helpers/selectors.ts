import { type Page, type Locator } from '@playwright/test';

/**
 * Selector Strategy (Black-Box Principle):
 * - NEVER use data-testid attributes
 * - Prefer getByRole() and getByText() for semantic selectors
 * - Use locator() with stable CSS only as fallback
 * - Document why each selector is stable
 */

// === Timer Selectors ===

export const Timer = {
  /**
   * Main timer display - uses text-7xl class (stable in Tailwind config)
   */
  display: (page: Page): Locator =>
    page.locator('.text-7xl').first(),

  /**
   * Timer running indicator - white text when running
   */
  runningIndicator: (page: Page): Locator =>
    page.locator('.text-7xl.text-white').first(),

  /**
   * Timer paused indicator - red text when paused
   */
  pausedIndicator: (page: Page): Locator =>
    page.locator('.text-7xl.text-red-500').first(),
};

// === Score Selectors ===

export const Score = {
  /**
   * Green player score (left side)
   */
  green: (page: Page): Locator =>
    page.locator('.text-6xl').first(),

  /**
   * Blue player score (right side)
   */
  blue: (page: Page): Locator =>
    page.locator('.text-6xl').last(),

  /**
   * Score value by player side
   */
  bySide: (page: Page, side: 'green' | 'blue'): Locator =>
    side === 'green'
      ? page.locator('.text-6xl').first()
      : page.locator('.text-6xl').last(),
};

// === Player Info Selectors ===

export const PlayerInfo = {
  /**
   * Green player name (left side)
   */
  greenName: (page: Page): Locator =>
    page.getByText('Player Left').first(),

  /**
   * Blue player name (right side)
   */
  blueName: (page: Page): Locator =>
    page.getByText('Player Right').first(),

  /**
   * Gender display
   */
  gender: (page: Page): Locator =>
    page.getByText('GENDER').first(),

  /**
   * Weight division
   */
  weight: (page: Page): Locator =>
    page.getByText('WEIGHT').first(),
};

// === Indicator Selectors ===

export const Indicator = {
  /**
   * Break indicator
   */
  break: (page: Page): Locator =>
    page.getByText('BREAK').first(),

  /**
   * Jazo indicator
   */
  jazo: (page: Page): Locator =>
    page.getByText('JAZO').first(),

  /**
   * Medic indicator
   */
  medic: (page: Page): Locator =>
    page.getByText('MEDIC').first(),
};

// === Dialog Selectors ===

export const Dialog = {
  /**
   * Any dialog
   */
  any: (page: Page): Locator =>
    page.getByRole('dialog'),

  /**
   * Reset timer dialog
   */
  resetTimer: (page: Page): Locator =>
    page.getByRole('dialog').filter({ hasText: 'Reset Timer' }),

  /**
   * Reset match dialog
   */
  resetMatch: (page: Page): Locator =>
    page.getByRole('dialog').filter({ hasText: 'Reset Match' }),

  /**
   * Confirm button in dialog
   */
  confirmButton: (page: Page): Locator =>
    page.getByRole('button', { name: /confirm|ok|yes/i }),

  /**
   * Cancel button in dialog
   */
  cancelButton: (page: Page): Locator =>
    page.getByRole('button', { name: /cancel|no/i }),
};

// === Navigation Selectors ===

export const Navigation = {
  /**
   * Connection status indicator
   */
  connectionStatus: (page: Page): Locator =>
    page.getByText(/connected|disconnected/i).first(),

  /**
   * Connected status
   */
  connected: (page: Page): Locator =>
    page.getByText('Connected').first(),

  /**
   * Disconnected status
   */
  disconnected: (page: Page): Locator =>
    page.getByText('Disconnected').first(),
};

// === Score Button Selectors ===

export const ScoreButton = {
  /**
   * K score button (any side)
   */
  k: (page: Page): Locator =>
    page.getByRole('button', { name: /K/i }).first(),

  /**
   * YO score button (any side)
   */
  yo: (page: Page): Locator =>
    page.getByRole('button', { name: /YO/i }).first(),

  /**
   * CH score button (any side)
   */
  ch: (page: Page): Locator =>
    page.getByRole('button', { name: /CH/i }).first(),
};

// === Penalty Button Selectors ===

export const PenaltyButton = {
  /**
   * G penalty button
   */
  g: (page: Page): Locator =>
    page.getByRole('button', { name: /G/i }).first(),

  /**
   * D penalty button
   */
  d: (page: Page): Locator =>
    page.getByRole('button', { name: /D/i }).first(),

  /**
   * T penalty button
   */
  t: (page: Page): Locator =>
    page.getByRole('button', { name: /T/i }).first(),
};

// === Queue Selectors ===

export const Queue = {
  /**
   * Queue count display
   */
  count: (page: Page): Locator =>
    page.locator('[class*="queue"]').first(),

  /**
   * Queue items
   */
  items: (page: Page): Locator =>
    page.locator('[class*="queue-item"]'),
};

// === Tournament Selectors ===

export const Tournament = {
  /**
   * Tournament name
   */
  name: (page: Page): Locator =>
    page.getByText(/tournament/i).first(),

  /**
   * Match list
   */
  matches: (page: Page): Locator =>
    page.locator('[class*="match"]'),
};

// === Toast Selectors ===
// Toast architecture: 2 slots (status, result), 3 tones (success, error, info)
// Template: refereeController.template.html:4264-4302
// role="status" + aria-live="polite" on each toast

export const Toast = {
  /**
   * Any visible toast (status or result)
   * Uses the accessibility role="status" attribute
   */
  any: (page: Page): Locator =>
    page.locator('[role="status"][aria-live="polite"]'),

  /**
   * Status banner toast (not closable, auto-dismiss)
   * From setup.ts: statusBanner ref
   */
  status: (page: Page): Locator =>
    page.locator('[role="status"][aria-live="polite"]').filter({ hasNot: page.locator('button') }).first(),

  /**
   * Result toast (closable, has Close button)
   * From setup.ts: showResultPopup ref
   */
  result: (page: Page): Locator =>
    page.locator('[role="status"][aria-live="polite"]').filter({ has: page.locator('button') }).first(),

  /**
   * Close button on result toast
   * From template:4293-4298
   */
  closeButton: (page: Page): Locator =>
    page.getByRole('button', { name: 'Close' }).first(),

  /**
   * Success toast (emerald styling)
   * From setup.ts:2597: 'border-emerald-500/45 bg-emerald-950/85 text-emerald-50'
   */
  success: (page: Page): Locator =>
    page.locator('[role="status"][aria-live="polite"].border-emerald-500\\/45').first(),

  /**
   * Error toast (rose styling)
   * From setup.ts:2598: 'border-rose-500/45 bg-rose-950/85 text-rose-50'
   */
  error: (page: Page): Locator =>
    page.locator('[role="status"][aria-live="polite"].border-rose-500\\/45').first(),

  /**
   * Info toast (blue styling)
   * From setup.ts:2599: 'border-blue-500/45 bg-slate-900/90 text-blue-50'
   */
  info: (page: Page): Locator =>
    page.locator('[role="status"][aria-live="polite"].border-blue-500\\/45').first(),

  /**
   * Warning toast (amber styling)
   * From setup.ts: 'border-amber-500/45 bg-amber-950/85 text-amber-50'
   */
  warning: (page: Page): Locator =>
    page.locator('[role="status"][aria-live="polite"].border-amber-500\\/45').first(),
};

// === Timer Label Selectors ===
// State-to-UI mapping: isMedicMode → "MEDIC TIMER", isBreakMode → "BREAK TIMER", default → "GAME TIMER"
// Template: refereeController.template.html:2356-2360

export const TimerLabel = {
  /**
   * Game timer label (default state)
   */
  game: (page: Page): Locator =>
    page.getByText('GAME TIMER').first(),

  /**
   * Break timer label (break mode active)
   */
  break: (page: Page): Locator =>
    page.getByText('BREAK TIMER').first(),

  /**
   * Medic timer label (medic mode active)
   */
  medic: (page: Page): Locator =>
    page.getByText('MEDIC TIMER').first(),
};

// === Button Label Selectors ===
// State-to-UI mapping for control buttons

export const ButtonLabel = {
  /**
   * Break button - text changes: "Break" ↔ "End Break"
   */
  break: (page: Page): Locator =>
    page.getByRole('button', { name: /Break/i }).first(),

  /**
   * End break button (when break is active)
   */
  endBreak: (page: Page): Locator =>
    page.getByRole('button', { name: /End Break/i }).first(),

  /**
   * Jazo button - text changes: "JAZO" ↔ "CLEAR JAZO"
   */
  jazo: (page: Page): Locator =>
    page.getByRole('button', { name: /JAZO/i }).first(),

  /**
   * Clear jazo button (when jazo is active)
   */
  clearJazo: (page: Page): Locator =>
    page.getByRole('button', { name: /CLEAR JAZO/i }).first(),
};
