/**
 * feedbackRegistry.ts — Centralized feedback registry for toast and indicator notifications.
 *
 * Replaces duplicated BannerType and inline ControllerToastTone with a single source of truth.
 * Uses plain Maps (not reactive) — consumers wrap in Vue reactive() as needed.
 */

// --- Shared Toast Types ---

/** Unified toast severity tone — replaces BannerType and ControllerToastTone. */
export type ToastTone = 'success' | 'error' | 'info' | 'warning'

/** Identifies which toast slot is being used (status bar vs. result overlay). */
export type ToastSlot = 'status' | 'result'

// --- Toast Registry Entry ---

/**
 * Describes a single toast event shown to the operator.
 * Every visible toast should have a corresponding entry registered in the FeedbackRegistry.
 */
export interface ToastEntry {
  /** Unique identifier (e.g. "match.start.success"). */
  id: string
  /** The toast message shown to the operator. */
  message: string
  /** Severity tone — determines visual styling. */
  tone: ToastTone
  /** Importance level — determines whether to show, silence, or log only. */
  importance: 'critical' | 'high' | 'medium' | 'low'
  /** Whether this toast auto-dismisses (true) or requires manual dismissal (false). */
  autoDismiss: boolean
  /** Whether this toast is currently silenced (UI state change provides sufficient feedback). */
  silenced: boolean
  /** Optional timeout override in ms. Null uses the default for the tone. */
  timeoutMs?: number | null
}

// --- Indicator Types ---

/** Possible indicator visual states. */
export type IndicatorState = 'active' | 'inactive' | 'warning' | 'error' | 'disabled'

/** Indicator semantic categories for grouping and filtering. */
export type IndicatorCategory = 'connection' | 'display' | 'match' | 'system'

/** Describes a persistent UI indicator (e.g. connection status, break timer, medic alert). */
export interface IndicatorDefinition {
  /** Unique identifier (e.g. "conn.websocket", "match.break", "system.jazo"). */
  id: string
  /** Human-readable label shown next to the indicator. */
  label: string
  /** Current visual state. */
  state: IndicatorState
  /** Category for grouping and filtering. */
  category: IndicatorCategory
  /** Tooltip text shown on hover. */
  tooltip: string
  /** Whether this indicator is currently visible in the UI. */
  visible: boolean
}

// --- Constants ---

/** Standard auto-dismiss timeouts by tone (ms). */
export const TOAST_TIMEOUTS: Record<ToastTone, number> = {
  success: 2500,
  info: 3000,
  warning: 4000,
  error: 5000,
}

/** Default importance level for each tone when no explicit importance is provided. */
export const DEFAULT_TONE_IMPORTANCE: Record<ToastTone, ToastEntry['importance']> = {
  success: 'low',
  info: 'medium',
  warning: 'high',
  error: 'critical',
}

// --- Feedback Registry ---

/** Centralized registry holding all known toast and indicator definitions. */
export interface FeedbackRegistry {
  toasts: Map<string, ToastEntry>
  indicators: Map<string, IndicatorDefinition>
  registerToast(entry: ToastEntry): void
  registerIndicator(indicator: IndicatorDefinition): void
  getToast(id: string): ToastEntry | undefined
  getIndicator(id: string): IndicatorDefinition | undefined
  getToastsByImportance(importance: ToastEntry['importance']): ToastEntry[]
  getIndicatorsByCategory(category: IndicatorCategory): IndicatorDefinition[]
  silenceToast(id: string): void
  unsilenceToast(id: string): void
}

// --- Factory ---

/**
 * Creates a new FeedbackRegistry instance using plain Map storage.
 * Wrap the result in Vue reactive() if reactivity is needed.
 */
export function createFeedbackRegistry(): FeedbackRegistry {
  const toasts = new Map<string, ToastEntry>()
  const indicators = new Map<string, IndicatorDefinition>()

  return {
    toasts,
    indicators,
    registerToast(entry) { toasts.set(entry.id, entry) },
    registerIndicator(ind) { indicators.set(ind.id, ind) },
    getToast(id) { return toasts.get(id) },
    getIndicator(id) { return indicators.get(id) },
    getToastsByImportance(importance) {
      return Array.from(toasts.values()).filter((t) => t.importance === importance)
    },
    getIndicatorsByCategory(category) {
      return Array.from(indicators.values()).filter((i) => i.category === category)
    },
    silenceToast(id) { const t = toasts.get(id); if (t) t.silenced = true },
    unsilenceToast(id) { const t = toasts.get(id); if (t) t.silenced = false },
  }
}
