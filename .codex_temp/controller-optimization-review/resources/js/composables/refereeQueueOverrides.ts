import type { RingQueueSource } from '@/composables/useRingDisplayQueue'

export interface PersistedResultOverride {
  status: string
  winner?: string | null
  winner_side?: string | null
  winner_id?: number | string | null
  result_details?: Record<string, unknown> | null
  ring_number?: string | null
  tournament_id?: number | string | null
  updated_at?: string | null
}

export interface QueueRowCounts {
  ready: number
  provisional: number
  hidden: number
  auto_advance: number
  completed: number
}

interface SelectionSnapshotScopeKeyOptions {
  tournamentId: number | string | null
  ring: string | null
  host: string | null
  snapshotId: number | string | null
}

interface OverrideStorageOptions extends SelectionSnapshotScopeKeyOptions {
  storage: Storage | null
}

interface ApplyResultOverrideOptions {
  rows: any[]
  overrides: Record<string, PersistedResultOverride>
  getRemoteMatchId: (row: any) => number | string | null
}

interface ReconcileLocalStatusOverrideOptions {
  overrides: Record<string, PersistedResultOverride>
  nextMatches: any[]
  isMatchIdEqual: (row: any, id: number | string | null) => boolean
}

export function buildSelectionSnapshotScopeKey(options: SelectionSnapshotScopeKeyOptions) {
  if (options.tournamentId == null || options.tournamentId === '') return ''
  const ringText = (options.ring || '1').toString().trim() || '1'
  const host = (options.host || '').toString().trim() || 'nohost'
  const snapshotPart = options.snapshotId == null
    ? 'nosnapshot'
    : String(options.snapshotId).trim()

  return `v2|${host}|${snapshotPart}|${String(options.tournamentId).trim()}|${ringText}`
}

export function buildResultOverrideStorageKey(scopeKey: string) {
  return scopeKey ? `sb_result_overrides_${scopeKey}` : ''
}

export function buildQueueCacheStorageKey(scopeKey: string) {
  return scopeKey ? `sb_cache_${scopeKey}` : ''
}

export function syncStatusOverridesFromResultOverrides(overrides: Record<string, PersistedResultOverride>) {
  const nextOverrides: Record<string, string> = {}
  for (const [id, override] of Object.entries(overrides || {})) {
    const status = (override?.status || '').toString().trim()
    if (!status) continue
    nextOverrides[id] = status
  }
  return nextOverrides
}

export function persistResultOverridesForSelection(options: OverrideStorageOptions & {
  overrides: Record<string, PersistedResultOverride>
}) {
  const scopeKey = buildSelectionSnapshotScopeKey(options)
  const storageKey = buildResultOverrideStorageKey(scopeKey)
  let nextOverrides = { ...(options.overrides || {}) }

  const trimmedEntries = Object.entries(nextOverrides)
    .sort((left, right) => {
      const leftTs = Date.parse(left[1]?.updated_at || '')
      const rightTs = Date.parse(right[1]?.updated_at || '')
      return (Number.isFinite(rightTs) ? rightTs : 0) - (Number.isFinite(leftTs) ? leftTs : 0)
    })
    .slice(0, 64)

  nextOverrides = Object.fromEntries(trimmedEntries)
  const statusOverrides = syncStatusOverridesFromResultOverrides(nextOverrides)

  if (options.storage && storageKey) {
    try {
      options.storage.setItem(storageKey, JSON.stringify(nextOverrides))
    } catch {}
  }

  return {
    overrides: nextOverrides,
    statusOverrides,
    storageKey,
  }
}

export function restoreResultOverridesForSelection(options: OverrideStorageOptions) {
  const scopeKey = buildSelectionSnapshotScopeKey(options)
  const storageKey = buildResultOverrideStorageKey(scopeKey)
  const emptyResult = {
    overrides: {} as Record<string, PersistedResultOverride>,
    statusOverrides: {} as Record<string, string>,
    storageKey,
  }

  if (!options.storage || !storageKey) return emptyResult

  try {
    const raw = options.storage.getItem(storageKey)
    if (!raw) return emptyResult

    const parsed = JSON.parse(raw)
    const nextOverrides: Record<string, PersistedResultOverride> = {}

    if (parsed && typeof parsed === 'object') {
      for (const [id, value] of Object.entries(parsed as Record<string, any>)) {
        if (!value || typeof value !== 'object') continue
        const status = (value.status || '').toString().trim()
        if (!status) continue
        nextOverrides[String(id)] = {
          status,
          winner: value.winner == null ? null : String(value.winner),
          winner_side: value.winner_side == null ? null : String(value.winner_side),
          winner_id: value.winner_id ?? null,
          result_details: value.result_details && typeof value.result_details === 'object'
            ? value.result_details as Record<string, unknown>
            : null,
          ring_number: value.ring_number == null ? null : String(value.ring_number),
          tournament_id: value.tournament_id ?? null,
          updated_at: value.updated_at == null ? null : String(value.updated_at),
        }
      }
    }

    return {
      overrides: nextOverrides,
      statusOverrides: syncStatusOverridesFromResultOverrides(nextOverrides),
      storageKey,
    }
  } catch {
    return emptyResult
  }
}

export function upsertLocalResultOverride(
  overrides: Record<string, PersistedResultOverride>,
  matchId: number | string | null,
  override: PersistedResultOverride,
) {
  if (matchId == null) return { ...(overrides || {}) }
  const key = String(matchId)
  return {
    ...(overrides || {}),
    [key]: {
      ...((overrides || {})[key] || {}),
      ...override,
      updated_at: override.updated_at ?? new Date().toISOString(),
    },
  }
}

export function applyLocalResultOverrides(options: ApplyResultOverrideOptions) {
  const overrides = options.overrides || {}
  if (!Array.isArray(options.rows) || !Object.keys(overrides).length) return Array.isArray(options.rows) ? options.rows : []

  return options.rows.map((row: any) => {
    const id = options.getRemoteMatchId(row)
    if (id == null) return row

    const override = overrides[String(id)]
    if (!override) return row

    const normalizedStatus = (override.status || '').toString().trim().toLowerCase()
    const isCompleted = normalizedStatus === 'completed'
    const displayClass =
      isCompleted
        ? 'COMPLETED'
        : ((row?.display_class ?? row?.displayClass ?? '').toString().trim().toUpperCase() || null)
    const queueReason =
      isCompleted
        ? 'completed matches are removed from the active queue'
        : (row?.queue_reason ?? row?.queueReason ?? null)

    return {
      ...row,
      status: override.status ?? row?.status,
      winner: override.winner ?? override.winner_side ?? row?.winner ?? row?.winner_side ?? null,
      winner_side: override.winner_side ?? override.winner ?? row?.winner_side ?? row?.winner ?? null,
      winner_id: override.winner_id ?? row?.winner_id ?? null,
      result_details: override.result_details ?? row?.result_details ?? null,
      ring_number: override.ring_number ?? row?.ring_number ?? row?.ringNumber ?? null,
      tournament_id: override.tournament_id ?? row?.tournament_id ?? null,
      updated_at: override.updated_at ?? row?.updated_at ?? null,
      display_class: displayClass,
      displayClass: displayClass,
      is_displayable: isCompleted ? false : (row?.is_displayable ?? row?.isDisplayable),
      isDisplayable: isCompleted ? false : (row?.isDisplayable ?? row?.is_displayable),
      hidden_reason: isCompleted ? 'completed_removed' : (row?.hidden_reason ?? row?.hiddenReason ?? null),
      hiddenReason: isCompleted ? 'completed_removed' : (row?.hiddenReason ?? row?.hidden_reason ?? null),
      queue_reason: queueReason,
      queueReason: queueReason,
    }
  })
}

export function countQueueRows(rows: any[]): QueueRowCounts {
  const counts: QueueRowCounts = {
    ready: 0,
    provisional: 0,
    hidden: 0,
    auto_advance: 0,
    completed: 0,
  }

  for (const row of Array.isArray(rows) ? rows : []) {
    const dc = (row as any)?.display_class ?? (row as any)?.displayClass ?? ''
    const displayClass = String(dc).toUpperCase()
    if (displayClass === 'READY') counts.ready++
    else if (displayClass === 'PROVISIONAL') counts.provisional++
    else if (displayClass === 'HIDDEN') counts.hidden++
    else if (displayClass === 'AUTO_ADVANCE') counts.auto_advance++
    else if (displayClass === 'COMPLETED') counts.completed++
  }

  return counts
}

export function reconcileLocalStatusOverrides(options: ReconcileLocalStatusOverrideOptions) {
  const currentOverrides = options.overrides || {}
  const nextOverrides: Record<string, PersistedResultOverride> = {}

  for (const [id, override] of Object.entries(currentOverrides)) {
    const normalizedStatus = (override?.status || '').toString().trim().toLowerCase()
    if (!normalizedStatus) continue

    if (normalizedStatus === 'completed') {
      nextOverrides[id] = override
      continue
    }

    const match = (options.nextMatches || []).find((item: any) => options.isMatchIdEqual(item, id))
    if (!match) {
      nextOverrides[id] = override
      continue
    }

    const matchStatus = (match?.status || '').toString().trim().toLowerCase()
    const displayClass = (match?.display_class ?? match?.displayClass ?? '').toString().trim().toUpperCase()
    if (matchStatus === normalizedStatus) {
      nextOverrides[id] = override
      continue
    }
    if (normalizedStatus === 'completed' && displayClass === 'COMPLETED') {
      nextOverrides[id] = override
      continue
    }

    nextOverrides[id] = override
  }

  return nextOverrides
}

export function getCachedSourceMode(isOnline: boolean): RingQueueSource {
  return isOnline ? 'cached_queue' : 'offline_cache'
}
