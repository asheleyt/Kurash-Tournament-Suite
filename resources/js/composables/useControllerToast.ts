/**
 * useControllerToast.ts — Reusable composable for the referee-controller toast system.
 *
 * Extracted from the monolithic refereeController.setup.ts to provide a self-contained
 * toast mechanism with deduplication, timed auto-dismiss, and two independent slots
 * (status banner and result popup).
 *
 * Usage:
 *   const { showBanner, showResultToast, visibleControllerToasts } = useControllerToast()
 */

import { ref, computed } from 'vue'
import type { ToastTone, ToastSlot } from './feedbackRegistry'
import { TOAST_TIMEOUTS } from './feedbackRegistry'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Identifies which toast slot is being dismissed. */
export type ControllerToastId = 'status' | 'result'

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

/**
 * Provides the controller-level toast system: status banners and result popups.
 *
 * The composable is **not** a singleton — each call creates an independent set of
 * reactive state.  In practice, a single instance is shared at the page level.
 *
 * @returns An object containing reactive state, imperative functions, computed
 *          helpers, and static class mappings consumed by the template.
 */
export function useControllerToast() {
  // --- State -------------------------------------------------------------

  /** Visibility, message, and tone for the persistent status banner. */
  const statusBanner = ref<{
    show: boolean
    message: string
    type: ToastTone
  }>({ show: false, message: '', type: 'info' })

  /** Auto-dismiss timer handle for the status banner. */
  let bannerTimer: number | null = null

  /** Auto-dismiss timer handle for the result popup. */
  let resultPopupTimer: number | null = null

  /** Whether the result popup is currently visible. */
  const showResultPopup = ref(false)

  /** Message displayed inside the result popup. */
  const resultPopupMessage = ref('')

  /** Tone used for the result popup visual styling. */
  const resultPopupType = ref<ToastTone>('success')

  // --- Deduplication -----------------------------------------------------

  /** Timestamps of recently shown toast messages used for deduplication. */
  const recentToastMessages = new Map<string, number>()

  /** Window (ms) within which an identical message is suppressed. */
  const TOAST_DEDUP_WINDOW_MS = 5000

  // --- Internal helpers --------------------------------------------------

  /**
   * Returns `true` when `message` was already shown within the deduplication
   * window.  Also registers the message for future checks.
   */
  function isDuplicateToast(message: string): boolean {
    const now = Date.now()
    const lastSeen = recentToastMessages.get(message)
    if (lastSeen && now - lastSeen < TOAST_DEDUP_WINDOW_MS) {
      return true
    }
    recentToastMessages.set(message, now)
    // Periodic cleanup of stale entries to prevent unbounded growth.
    if (recentToastMessages.size > 50) {
      for (const [key, timestamp] of recentToastMessages) {
        if (now - timestamp > TOAST_DEDUP_WINDOW_MS * 2) {
          recentToastMessages.delete(key)
        }
      }
    }
    return false
  }

  // --- Imperative API ----------------------------------------------------

  /**
   * Show (or replace) the status banner.
   *
   * @param message  Text to display.
   * @param type     Visual tone — defaults to `'info'`.
   * @param timeout  Override auto-dismiss timeout in ms.  When omitted the
   *                 default for `type` from `TOAST_TIMEOUTS` is used.
   */
  function showBanner(
    message: string,
    type: ToastTone = 'info',
    timeout?: number,
  ) {
    if (isDuplicateToast(message)) return
    const effectiveTimeout = timeout ?? TOAST_TIMEOUTS[type]
    statusBanner.value = { show: true, message, type }
    if (bannerTimer) clearTimeout(bannerTimer)
    bannerTimer = setTimeout(() => {
      statusBanner.value.show = false
    }, effectiveTimeout) as unknown as number
  }

  /**
   * Show (or replace) the result popup toast.
   *
   * @param message  Text to display.
   * @param type     Visual tone — defaults to `'success'`.
   * @param timeout  Override auto-dismiss timeout in ms.
   */
  function showResultToast(
    message: string,
    type: ToastTone = 'success',
    timeout?: number,
  ) {
    const effectiveTimeout = timeout ?? TOAST_TIMEOUTS[type]
    resultPopupMessage.value = message
    resultPopupType.value = type
    showResultPopup.value = true
    if (resultPopupTimer) clearTimeout(resultPopupTimer)
    resultPopupTimer = setTimeout(() => {
      showResultPopup.value = false
      resultPopupTimer = null
    }, effectiveTimeout) as unknown as number
  }

  /** Immediately hide the result popup and cancel its auto-dismiss timer. */
  function hideResultToast() {
    showResultPopup.value = false
    if (resultPopupTimer) {
      clearTimeout(resultPopupTimer)
      resultPopupTimer = null
    }
  }

  /**
   * Dismiss a specific toast by slot id.
   *
   * @param id  `'status'` hides the banner; `'result'` hides the popup.
   */
  function dismissControllerToast(id: ControllerToastId) {
    if (id === 'result') {
      hideResultToast()
      return
    }

    statusBanner.value.show = false
    if (bannerTimer) {
      clearTimeout(bannerTimer)
      bannerTimer = null
    }
  }

  // --- Visual class maps -------------------------------------------------

  /** Tailwind classes applied to the toast body for each tone. */
  const controllerToastToneClasses: Record<ToastTone, string> = {
    success: 'border-emerald-500/45 bg-emerald-950/85 text-emerald-50',
    error: 'border-rose-500/45 bg-rose-950/85 text-rose-50',
    info: 'border-blue-500/45 bg-slate-900/90 text-blue-50',
    warning: 'border-amber-500/45 bg-amber-950/85 text-amber-50',
  }

  /** Tailwind classes applied to the toast icon for each tone. */
  const controllerToastIconClasses: Record<ToastTone, string> = {
    success: 'text-emerald-300',
    error: 'text-rose-300',
    info: 'text-blue-300',
    warning: 'text-amber-300',
  }

  // --- Computed ----------------------------------------------------------

  /**
   * Reactive list of currently visible toasts (at most 2), ordered oldest-first.
   * Each entry carries pre-resolved CSS classes ready for the template.
   */
  const visibleControllerToasts = computed(() => {
    const toasts: {
      id: ControllerToastId
      message: string
      type: ToastTone
      toneClass: string
      iconClass: string
      closable: boolean
    }[] = []

    if (statusBanner.value.show && statusBanner.value.message) {
      toasts.push({
        id: 'status',
        message: statusBanner.value.message,
        type: statusBanner.value.type,
        toneClass: controllerToastToneClasses[statusBanner.value.type],
        iconClass: controllerToastIconClasses[statusBanner.value.type],
        closable: false,
      })
    }

    if (showResultPopup.value && resultPopupMessage.value) {
      toasts.push({
        id: 'result',
        message: resultPopupMessage.value,
        type: resultPopupType.value,
        toneClass: controllerToastToneClasses[resultPopupType.value],
        iconClass: controllerToastIconClasses[resultPopupType.value],
        closable: true,
      })
    }

    return toasts.slice(-2)
  })

  // --- Public API --------------------------------------------------------

  return {
    /** Status banner reactive state — message, visibility, and tone. */
    statusBanner,
    /** Whether the result popup is currently visible. */
    showResultPopup,
    /** Message text shown in the result popup. */
    resultPopupMessage,
    /** Tone of the result popup. */
    resultPopupType,

    /** Show (or replace) the status banner toast. */
    showBanner,
    /** Show (or replace) the result popup toast. */
    showResultToast,
    /** Immediately dismiss the result popup. */
    hideResultToast,
    /** Dismiss a toast by slot id (`'status'` or `'result'`). */
    dismissControllerToast,

    /**
     * Computed list of visible toasts with pre-resolved CSS classes.
     * At most 2 entries, ordered oldest-first.
     */
    visibleControllerToasts,

    /** Tailwind class map for toast body styling keyed by tone. */
    controllerToastToneClasses,
    /** Tailwind class map for toast icon styling keyed by tone. */
    controllerToastIconClasses,
  }
}
