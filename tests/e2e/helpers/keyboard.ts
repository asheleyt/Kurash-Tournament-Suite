import { type Page } from '@playwright/test';
import keybindingsData from '../data/keybindings.json' with { type: 'json' };

const keybindings = keybindingsData.bindings;

export interface KeyBinding {
  action: string;
  keys: string[];
  label: string;
  category: string;
}

/**
 * Get key binding by action name
 */
export function getBinding(action: string): KeyBinding | undefined {
  return keybindings.find((b) => b.action === action);
}

/**
 * Get all key bindings
 */
export function getAllBindings(): KeyBinding[] {
  return [...keybindings];
}

/**
 * Get bindings by category
 */
export function getBindingsByCategory(category: string): KeyBinding[] {
  return keybindings.filter((b) => b.category === category);
}

/**
 * Parse a key combination string into Playwright keyboard API calls
 * e.g., "Shift+KeyR" -> { modifiers: ['Shift'], key: 'KeyR' }
 */
function parseKeyString(keyString: string): { modifiers: string[]; key: string } {
  const parts = keyString.split('+');
  const modifiers: string[] = [];
  let key = '';

  for (const part of parts) {
    switch (part) {
      case 'Shift':
      case 'Ctrl':
      case 'Alt':
      case 'Meta':
        modifiers.push(part);
        break;
      default:
        key = part;
        break;
    }
  }

  return { modifiers, key };
}

/**
 * Press a single key with optional modifiers
 */
export async function pressKey(page: Page, keyString: string): Promise<void> {
  const { modifiers, key } = parseKeyString(keyString);

  // Press modifiers down
  for (const modifier of modifiers) {
    await page.keyboard.down(modifier);
  }

  // Press the key
  await page.keyboard.press(key);

  // Release modifiers
  for (const modifier of modifiers.reverse()) {
    await page.keyboard.up(modifier);
  }
}

/**
 * Execute a keyboard action by action name
 */
export async function executeAction(page: Page, action: string): Promise<void> {
  const binding = getBinding(action);
  if (!binding) {
    throw new Error(`Unknown action: ${action}`);
  }

  // Use the first key in the binding (primary key)
  await pressKey(page, binding.keys[0]);
}

// === Semantic Actions ===

/**
 * Timer Controls
 */
export async function startTimer(page: Page): Promise<void> {
  await executeAction(page, 'toggleTimer');
}

export async function pauseTimer(page: Page): Promise<void> {
  await executeAction(page, 'toggleTimer');
}

export async function resumeTimer(page: Page): Promise<void> {
  await executeAction(page, 'toggleTimer');
}

export async function resetTimer(page: Page): Promise<void> {
  await executeAction(page, 'resetTimer');
}

export async function adjustTime(page: Page): Promise<void> {
  await executeAction(page, 'adjustTime');
}

export async function setStartTime(page: Page): Promise<void> {
  await executeAction(page, 'setStartTime');
}

/**
 * Scoring - Green (Player 1 / Left)
 */
export async function scoreKGreen(page: Page): Promise<void> {
  await executeAction(page, 'player1ScoreK');
}

export async function scoreYOGreen(page: Page): Promise<void> {
  await executeAction(page, 'player1ScoreYO');
}

export async function scoreCHGreen(page: Page): Promise<void> {
  await executeAction(page, 'player1ScoreCH');
}

/**
 * Scoring - Blue (Player 2 / Right)
 */
export async function scoreKBlue(page: Page): Promise<void> {
  await executeAction(page, 'player2ScoreK');
}

export async function scoreYOBlue(page: Page): Promise<void> {
  await executeAction(page, 'player2ScoreYO');
}

export async function scoreCHBlue(page: Page): Promise<void> {
  await executeAction(page, 'player2ScoreCH');
}

/**
 * Penalties - Green
 */
export async function penaltyGGreen(page: Page): Promise<void> {
  await executeAction(page, 'player1PenaltyG');
}

export async function penaltyDGreen(page: Page): Promise<void> {
  await executeAction(page, 'player1PenaltyD');
}

export async function penaltyTGreen(page: Page): Promise<void> {
  await executeAction(page, 'player1PenaltyT');
}

/**
 * Penalties - Blue
 */
export async function penaltyGBlue(page: Page): Promise<void> {
  await executeAction(page, 'player2PenaltyG');
}

export async function penaltyDBlue(page: Page): Promise<void> {
  await executeAction(page, 'player2PenaltyD');
}

export async function penaltyTBlue(page: Page): Promise<void> {
  await executeAction(page, 'player2PenaltyT');
}

/**
 * Indicators
 */
export async function toggleBreak(page: Page): Promise<void> {
  await executeAction(page, 'toggleBreak');
}

export async function toggleJazo(page: Page): Promise<void> {
  await executeAction(page, 'toggleJazo');
}

export async function toggleMedicGreen(page: Page): Promise<void> {
  await executeAction(page, 'player1Medic');
}

export async function toggleMedicBlue(page: Page): Promise<void> {
  await executeAction(page, 'player2Medic');
}

/**
 * Match Control
 */
export async function undo(page: Page): Promise<void> {
  await executeAction(page, 'undo');
}

export async function resetMatch(page: Page): Promise<void> {
  await executeAction(page, 'resetMatch');
}

export async function selectWinnerGreen(page: Page): Promise<void> {
  await executeAction(page, 'player1Winner');
}

export async function selectWinnerBlue(page: Page): Promise<void> {
  await executeAction(page, 'player2Winner');
}
