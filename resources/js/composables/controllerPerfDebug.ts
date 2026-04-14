const CONTROLLER_PERF_DEBUG_STORAGE_KEY = 'kurash:controller:perf-debug'

export type ControllerPerfScope = 'queue' | 'ring'
export type ControllerPerfStorageAction = 'write' | 'skip'
export type ControllerPerfBroadcastAction = 'write' | 'skip' | 'n/a'

interface ControllerPerfSummaryOptions {
  fetchDurationMs: number
  applyDurationMs: number
  storage: ControllerPerfStorageAction
  broadcast: ControllerPerfBroadcastAction
  skip: string
}

export function nowPerfMs() {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now()
  }
  return Date.now()
}

export function isControllerPerfDebugEnabled() {
  try {
    return globalThis.localStorage?.getItem(CONTROLLER_PERF_DEBUG_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function formatPerfDuration(durationMs: number) {
  if (!Number.isFinite(durationMs)) return 'n/a'
  return `${Math.max(0, Math.round(durationMs))}ms`
}

export function logControllerPerfSummary(scope: ControllerPerfScope, options: ControllerPerfSummaryOptions) {
  if (!isControllerPerfDebugEnabled()) return

  console.debug(
    `[controller-perf][${scope}] fetch=${formatPerfDuration(options.fetchDurationMs)} apply=${formatPerfDuration(options.applyDurationMs)} storage=${options.storage} broadcast=${options.broadcast} skip=${options.skip}`,
  )
}
