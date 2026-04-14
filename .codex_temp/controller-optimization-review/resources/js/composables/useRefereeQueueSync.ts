import type { Ref } from 'vue'
import type { RingQueueSource } from '@/composables/useRingDisplayQueue'
import {
  applyLocalResultOverrides as applyLocalResultOverridesToRows,
  buildSelectionSnapshotScopeKey,
  countQueueRows as countQueueRowsFromRows,
  getCachedSourceMode,
  persistResultOverridesForSelection as persistResultOverridesToStorage,
  reconcileLocalStatusOverrides as reconcileLocalStatusOverridesInMemory,
  restoreResultOverridesForSelection as restoreResultOverridesFromStorage,
  upsertLocalResultOverride as upsertLocalResultOverrideInMemory,
  type PersistedResultOverride,
} from '@/composables/refereeQueueOverrides'
import {
  readQueueCacheFromStorage,
  writeQueueCacheToStorage,
  type QueueCacheStateSnapshot,
} from '@/composables/refereeQueueStorage'

type BannerType = 'success' | 'error' | 'info'
type ReadRef<T> = Readonly<Ref<T>>

interface UseRefereeQueueSyncOptions {
  adminBase: Ref<string>
  selectedTournamentId: Ref<number | null>
  selectedRing: Ref<string>
  manualSelectedRing: Ref<string>
  effectiveTournamentId: ReadRef<number | null>
  effectiveRing: ReadRef<string>
  activeAssignmentSnapshotId: ReadRef<number | string | null>
  liveSnapshotContextKey: ReadRef<string>
  normalizedControllerAdminBase: ReadRef<string>
  hasKnownDeviceCredentials: ReadRef<boolean>
  hasAssignedSetup: ReadRef<boolean>
  syncHasServer: ReadRef<boolean>
  tournaments: Ref<any[]>
  selectedTournamentSummary: Ref<any>
  ringOptions: Ref<string[]>
  matchesList: Ref<any[]>
  allMatchesList: Ref<any[]>
  isLoadingMatches: Ref<boolean>
  isLoadingTournaments: Ref<boolean>
  isFetchingAll: Ref<boolean>
  isCheckingStatus: Ref<boolean>
  isOnline: Ref<boolean>
  lastOnlineState: Ref<boolean | null>
  isLocalData: Ref<boolean>
  isUnauthorized: Ref<boolean>
  upstreamQueueVersion: Ref<string | null>
  controllerSnapshotVersion: Ref<string | null>
  upstreamGeneratedAt: Ref<string | null>
  controllerGeneratedAt: Ref<string | null>
  queueSourceMode: Ref<RingQueueSource | null>
  queueIsDegraded: Ref<boolean>
  queueDegradedReason: Ref<string | null>
  queueReadyCount: Ref<number>
  queueProvisionalCount: Ref<number>
  queueHiddenCount: Ref<number>
  queueAutoAdvanceCount: Ref<number>
  queueCompletedRemovedCount: Ref<number>
  queueVersionGuardContextKey: Ref<string>
  pendingLiveSnapshotRecoveryContextKey: Ref<string | null>
  isLiveSnapshotRecoveryBusy: Ref<boolean>
  lastSyncAt: Ref<number | null>
  nextUpcomingMatchId: Ref<number | string | null>
  localResultOverrides: Ref<Record<string, PersistedResultOverride>>
  localStatusOverrides: Ref<Record<string, string>>
  dbSyncedTournaments: Ref<Record<number, boolean>>
  isDbSyncing: Ref<boolean>
  ensureConfigLoaded: () => Promise<void>
  localApiUrl: (path: string) => URL
  attachAdminBase: (url: URL) => void
  headers: (withJson?: boolean) => Record<string, string>
  reportFetchFailure: (
    contextLabel: string,
    requestUrl: string,
    status: number,
    body: string,
    options?: { notify?: boolean },
  ) => void
  safeApiErrorMessage: (status: number, body: string, maxLen?: number) => string
  normalizeApiBaseInput: (input: string) => string
  persistAdminBase: () => void
  reconnectKnownDeviceSession: (showSuccessBanner?: boolean) => Promise<boolean>
  maybeAutoLoadAssignedMatch: (tournamentId: number, ring: string, options?: { force?: boolean }) => Promise<void>
  clearLegacyClubBrandingCache: () => void
  hydrateFetchedTeamBranding: (source: any, tournament?: any, matches?: any[] | null | undefined) => void
  warnBracketRingConflicts: (matches: any[], tournamentId: number | null) => void
  getMatchRingText: (match: any) => string
  getFallbackRingText: (match: any, idx: number, ringCount: number) => string
  getBracketGroupKey: (match: any) => string
  getBracketIdText: (match: any) => string
  getAgeCategoryLabel: (match: any) => string
  getWeightCategoryLabel: (match: any) => string
  getBracketKeyForMatch: (match: any) => string
  loggedBracketRingConflicts: Set<string>
  normalizeQueueRows: (rows: any[], options?: { source?: RingQueueSource }) => any[]
  getRemoteMatchId: (match: any) => number | string | null
  getEffectiveStatus: (match: any) => string
  isMatchIdEqual: (match: any, id: number | string | null) => boolean
  persistSelectedRing: () => void
  showBanner: (message: string, type?: BannerType, timeout?: number) => void
  getSyncFallbackReasonLabel: () => string
  getStorage: () => Storage | null
}

export function useRefereeQueueSync(options: UseRefereeQueueSyncOptions) {
  let scoreboardFetchSeq = 0
  let queuedDbSyncTournamentId: number | null = null

  function getTournamentNameById(tournamentId: number | string | null | undefined): string {
    if (tournamentId == null || tournamentId === '') return ''
    const numericId = Number(tournamentId)
    if (!Number.isFinite(numericId)) return ''
    const tournament = options.tournaments.value.find((item: any) => Number(item?.id) === Number(numericId))
    return (tournament?.name ?? '').toString().trim()
  }

  function getSelectedTournamentName(tournamentId: number | string | null = options.selectedTournamentId.value): string {
    if (!tournamentId) return ''
    return (
      getTournamentNameById(tournamentId)
      || options.selectedTournamentSummary.value?.name
      || ''
    ).toString().trim()
  }

  function selectionSnapshotScopeKey(
    tournamentId: number | string | null = options.selectedTournamentId.value,
    ring: string | null = options.selectedRing.value,
  ) {
    return buildSelectionSnapshotScopeKey({
      tournamentId,
      ring,
      host: options.normalizedControllerAdminBase.value || 'nohost',
      snapshotId: options.activeAssignmentSnapshotId.value,
    })
  }

  function persistResultOverridesForSelection(
    tournamentId: number | string | null = options.selectedTournamentId.value,
    ring: string | null = options.selectedRing.value,
  ) {
    const persisted = persistResultOverridesToStorage({
      storage: options.getStorage(),
      overrides: options.localResultOverrides.value,
      tournamentId,
      ring,
      host: options.normalizedControllerAdminBase.value || 'nohost',
      snapshotId: options.activeAssignmentSnapshotId.value,
    })
    options.localResultOverrides.value = persisted.overrides
    options.localStatusOverrides.value = persisted.statusOverrides
  }

  function restoreResultOverridesForSelection(
    tournamentId: number | string | null = options.selectedTournamentId.value,
    ring: string | null = options.selectedRing.value,
  ) {
    const restored = restoreResultOverridesFromStorage({
      storage: options.getStorage(),
      tournamentId,
      ring,
      host: options.normalizedControllerAdminBase.value || 'nohost',
      snapshotId: options.activeAssignmentSnapshotId.value,
    })
    options.localResultOverrides.value = restored.overrides
    options.localStatusOverrides.value = restored.statusOverrides
  }

  function upsertLocalResultOverride(
    matchId: number | string | null,
    override: PersistedResultOverride,
    tournamentId: number | string | null = options.selectedTournamentId.value,
    ring: string | null = options.selectedRing.value,
  ) {
    options.localResultOverrides.value = upsertLocalResultOverrideInMemory(
      options.localResultOverrides.value,
      matchId,
      override,
    )
    persistResultOverridesForSelection(tournamentId, ring)
  }

  function applyLocalResultOverrides(rows: any[]) {
    return applyLocalResultOverridesToRows({
      rows,
      overrides: options.localResultOverrides.value,
      getRemoteMatchId: options.getRemoteMatchId,
    })
  }

  function countQueueRows(rows: any[]) {
    return countQueueRowsFromRows(rows)
  }

  function reconcileLocalStatusOverrides(nextMatches: any[]) {
    options.localResultOverrides.value = reconcileLocalStatusOverridesInMemory({
      overrides: options.localResultOverrides.value,
      nextMatches,
      isMatchIdEqual: options.isMatchIdEqual,
    })
    persistResultOverridesForSelection()
  }

  function resetQueueMeta() {
    options.upstreamQueueVersion.value = null
    options.controllerSnapshotVersion.value = null
    options.upstreamGeneratedAt.value = null
    options.controllerGeneratedAt.value = null
    options.queueVersionGuardContextKey.value = ''
    options.queueSourceMode.value = null
    options.queueIsDegraded.value = false
    options.queueDegradedReason.value = null
    options.localResultOverrides.value = {}
    options.localStatusOverrides.value = {}
    options.queueReadyCount.value = 0
    options.queueProvisionalCount.value = 0
    options.queueHiddenCount.value = 0
    options.queueAutoAdvanceCount.value = 0
    options.queueCompletedRemovedCount.value = 0
  }

  function resetLiveSnapshotBaselines() {
    options.upstreamQueueVersion.value = null
    options.controllerSnapshotVersion.value = null
    options.upstreamGeneratedAt.value = null
    options.controllerGeneratedAt.value = null
    options.queueVersionGuardContextKey.value = ''
  }

  function markLiveSnapshotRecoveryPending() {
    const contextKey = options.liveSnapshotContextKey.value
    if (!contextKey) return
    options.pendingLiveSnapshotRecoveryContextKey.value = contextKey
  }

  function clearLiveSnapshotRecoveryPending(contextKey: string | null = options.liveSnapshotContextKey.value) {
    if (!contextKey || options.pendingLiveSnapshotRecoveryContextKey.value === contextKey) {
      options.pendingLiveSnapshotRecoveryContextKey.value = null
    }
  }

  function readLocalCacheMeta() {
    const scopeKey = selectionSnapshotScopeKey()
    if (!scopeKey) {
      options.lastSyncAt.value = null
      resetQueueMeta()
      restoreResultOverridesForSelection()
      return
    }

    const cached = readQueueCacheFromStorage(options.getStorage(), scopeKey)
    if (!cached) {
      options.lastSyncAt.value = null
      resetQueueMeta()
      restoreResultOverridesForSelection()
      return
    }

    options.lastSyncAt.value = cached.lastSyncAt
    options.upstreamQueueVersion.value = cached.upstreamQueueVersion
    options.upstreamGeneratedAt.value = cached.upstreamGeneratedAt
    options.controllerSnapshotVersion.value = cached.controllerSnapshotVersion
    options.controllerGeneratedAt.value = cached.controllerGeneratedAt

    if (
      !options.queueSourceMode.value
      || options.queueSourceMode.value === 'cached_queue'
      || options.queueSourceMode.value === 'offline_cache'
    ) {
      options.queueSourceMode.value = getCachedSourceMode(options.isOnline.value)
      options.queueIsDegraded.value = true
      options.queueDegradedReason.value = 'local_cache'
      markLiveSnapshotRecoveryPending()
    }

    options.queueReadyCount.value = cached.readyCount
    options.queueProvisionalCount.value = cached.provisionalCount
    options.queueHiddenCount.value = cached.hiddenCount
    options.queueAutoAdvanceCount.value = cached.autoAdvanceCount
    options.queueCompletedRemovedCount.value = cached.completedRemovedCount
    restoreResultOverridesForSelection()
  }

  function writeLocalCache(items: any[], meta: {
    upstream_queue_version?: string | null
    upstream_generated_at?: string | null
    source_mode?: RingQueueSource | null
    is_degraded?: boolean
    degraded_reason?: string | null
    ready_count?: number
    provisional_count?: number
    hidden_count?: number
    auto_advance_count?: number
    completed_removed_count?: number
    controller_snapshot_version?: string | null
    controller_generated_at?: string | null
  } = {}) {
    const scopeKey = selectionSnapshotScopeKey()
    if (!scopeKey) return

    const controllerTs = writeQueueCacheToStorage(
      options.getStorage(),
      scopeKey,
      items,
      {
        upstreamQueueVersion: meta.upstream_queue_version ?? options.upstreamQueueVersion.value,
        upstreamGeneratedAt: meta.upstream_generated_at ?? options.upstreamGeneratedAt.value,
        sourceMode: meta.source_mode ?? options.queueSourceMode.value,
        isDegraded: meta.is_degraded ?? options.queueIsDegraded.value,
        degradedReason: meta.degraded_reason ?? options.queueDegradedReason.value,
        readyCount: meta.ready_count ?? options.queueReadyCount.value,
        provisionalCount: meta.provisional_count ?? options.queueProvisionalCount.value,
        hiddenCount: meta.hidden_count ?? options.queueHiddenCount.value,
        autoAdvanceCount: meta.auto_advance_count ?? options.queueAutoAdvanceCount.value,
        completedRemovedCount: meta.completed_removed_count ?? options.queueCompletedRemovedCount.value,
        controllerSnapshotVersion: meta.controller_snapshot_version ?? options.controllerSnapshotVersion.value,
        controllerGeneratedAt: meta.controller_generated_at ?? options.controllerGeneratedAt.value,
      } satisfies QueueCacheStateSnapshot,
    )

    if (controllerTs != null) {
      options.lastSyncAt.value = controllerTs
    }
  }

  async function heartbeat() {
    await options.ensureConfigLoaded()
    const url = options.localApiUrl('/status')
    options.attachAdminBase(url)
    const res = await fetch(url.toString(), { headers: options.headers() })
    const body = await res.text()
    if (!res.ok) {
      options.reportFetchFailure('Heartbeat', url.toString(), res.status, body, { notify: true })
      throw new Error(`Heartbeat failed: ${res.status}. ${options.safeApiErrorMessage(res.status, body)}`)
    }
    try {
      return JSON.parse(body) as any
    } catch {
      console.error('Heartbeat response was not JSON', {
        url: url.toString(),
        status: res.status,
        body,
      })
      throw new Error(`Heartbeat failed: response was not JSON (${res.status}). ${options.safeApiErrorMessage(res.status, body)}`)
    }
  }

  async function listTournamentsRemote() {
    await options.ensureConfigLoaded()
    const url = options.localApiUrl('/tournaments')
    options.attachAdminBase(url)
    const res = await fetch(url.toString(), { headers: options.headers() })
    const body = await res.text()
    if (!res.ok) {
      options.reportFetchFailure('Tournament list', url.toString(), res.status, body, { notify: true })
      throw new Error(`List failed: ${res.status}. ${options.safeApiErrorMessage(res.status, body)}`)
    }

    let json: { tournaments?: unknown }
    try {
      json = JSON.parse(body) as { tournaments?: unknown }
    } catch {
      throw new Error(`List failed: response was not JSON (${res.status}). ${options.safeApiErrorMessage(res.status, body)}`)
    }
    if (Array.isArray(json.tournaments)) return json.tournaments as any[]
    if (Array.isArray(json as any)) return json as any[]
    return []
  }

  async function getScoreboardDataLocal(id: number, tournamentName?: string) {
    const url = new URL(`/api/tournaments/${id}/scoreboard-data`, window.location.origin)
    url.searchParams.set('local', '1')
    const tournamentNameText = (tournamentName || '').toString().trim()
    if (tournamentNameText) url.searchParams.set('tournament_name', tournamentNameText)

    const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } })
    const body = await res.text()
    if (!res.ok) throw new Error(`Matches failed: ${res.status}. ${options.safeApiErrorMessage(res.status, body)}`)

    let json: any
    try {
      json = JSON.parse(body)
    } catch {
      throw new Error(`Matches: not JSON (${res.status}). ${options.safeApiErrorMessage(res.status, body)}`)
    }

    const brackets = Array.isArray(json?.brackets) ? json.brackets : []
    const flattened: any[] = []
    for (const bracket of brackets) {
      const bracketMatches = Array.isArray(bracket?.matches) ? bracket.matches : []
      for (const match of bracketMatches) {
        if (!match || typeof match !== 'object') continue
        const nextMatch: any = { ...match }
        if (!nextMatch.gender && bracket?.gender) nextMatch.gender = bracket.gender
        if (!nextMatch.age_category && bracket?.age_category) nextMatch.age_category = bracket.age_category
        if (!nextMatch.category && bracket?.weight_category) nextMatch.category = bracket.weight_category
        flattened.push(nextMatch)
      }
    }

    return {
      matches: flattened,
      tournament: json?.tournament ?? { id, name: tournamentNameText || 'Tournament' },
      source: json?.source ?? 'local',
      scoped_by: (json as any)?.scoped_by ?? null,
    }
  }

  async function syncTournamentRemote(id: number) {
    await options.ensureConfigLoaded()
    const url = new URL('/api/tournament/sync', window.location.origin)
    try {
      if (options.adminBase.value) url.searchParams.set('admin_base', options.adminBase.value)
    } catch {}

    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: options.headers(true),
      body: JSON.stringify({ tournament_id: id }),
    })
    const body = await res.text()
    if (!res.ok) throw new Error(`Sync failed: ${res.status}. ${options.safeApiErrorMessage(res.status, body)}`)
    try {
      return JSON.parse(body) as Record<string, unknown>
    } catch {
      throw new Error(`Sync: response not JSON (${res.status}). ${options.safeApiErrorMessage(res.status, body)}`)
    }
  }

  async function saveTournamentToLocalDb(id: number) {
    if (!id) return
    if (options.dbSyncedTournaments.value[id]) return
    if (options.isDbSyncing.value) {
      queuedDbSyncTournamentId = id
      return
    }

    options.isDbSyncing.value = true
    try {
      options.showBanner('Saving match list to local DB...', 'info', 3000)
      await syncTournamentRemote(id)
      options.dbSyncedTournaments.value = { ...options.dbSyncedTournaments.value, [id]: true }
      options.showBanner('Saved match list to kurash_db', 'success', 2200)
    } catch (error: any) {
      options.showBanner(error?.message || 'Failed to save match list to local DB.', 'error', 6500)
    } finally {
      options.isDbSyncing.value = false
      const queued = queuedDbSyncTournamentId
      queuedDbSyncTournamentId = null
      if (queued && !options.dbSyncedTournaments.value[queued]) {
        saveTournamentToLocalDb(queued).catch(() => {})
      }
    }
  }

  async function getRingQueueRemote(id: number, ring: string) {
    await options.ensureConfigLoaded()
    const ringText = (ring || '').toString().trim()
    if (!ringText) throw new Error('Gilam is required')

    const url = options.localApiUrl(`/tournaments/${id}/rings/${ringText}/queue`)
    options.attachAdminBase(url)

    const res = await fetch(url.toString(), { headers: options.headers() })
    const body = await res.text()
    if (!res.ok) {
      options.reportFetchFailure('Ring queue', url.toString(), res.status, body, { notify: true })
      throw new Error(`Queue failed: ${res.status}. ${options.safeApiErrorMessage(res.status, body)}`)
    }

    let json: Record<string, unknown>
    try {
      json = JSON.parse(body) as Record<string, unknown>
    } catch {
      throw new Error(`Queue: response was not JSON (${res.status}). ${options.safeApiErrorMessage(res.status, body)}`)
    }

    if (json?.success === false) {
      const message = typeof json?.message === 'string' ? json.message : 'Queue endpoint rejected the request'
      throw new Error(message)
    }

    return json
  }

  function applyQueuePayload(
    payload: Record<string, unknown>,
    sourceMode: RingQueueSource,
    optionsForPayload: { degraded_reason?: string | null } = {},
  ) {
    const upstreamVersion = typeof payload?.queue_version === 'string' ? payload.queue_version : null
    const upstreamGeneratedAt = typeof payload?.generated_at === 'string' ? payload.generated_at : null
    const rawItems = Array.isArray(payload?.items) ? payload.items : null
    if (!rawItems) throw new Error('Queue payload missing items[]')
    restoreResultOverridesForSelection()

    try {
      const currentContextKey = options.liveSnapshotContextKey.value
      const shouldApplyRegressionGuard =
        sourceMode === 'queue_api'
        && options.queueSourceMode.value === 'queue_api'
        && !!currentContextKey
        && options.queueVersionGuardContextKey.value === currentContextKey

      if (shouldApplyRegressionGuard) {
        const currentVersion = (options.upstreamQueueVersion.value || '').toString().trim()
        const nextVersion = (upstreamVersion || '').toString().trim()
        if (currentVersion && nextVersion) {
          const currentNumber = Number(currentVersion)
          const nextNumber = Number(nextVersion)
          if (
            Number.isFinite(currentNumber)
            && Number.isFinite(nextNumber)
            && Math.floor(currentNumber) === currentNumber
            && Math.floor(nextNumber) === nextNumber
          ) {
            if (nextNumber < currentNumber) {
              console.warn('Ignored stale queue payload (queue_version regressed):', { currentContextKey, currentVersion, nextVersion })
              return
            }
          } else {
            const currentTime = Date.parse(currentVersion)
            const nextTime = Date.parse(nextVersion)
            if (Number.isFinite(currentTime) && Number.isFinite(nextTime) && nextTime < currentTime) {
              console.warn('Ignored stale queue payload (queue_version timestamp regressed):', { currentContextKey, currentVersion, nextVersion })
              return
            }
          }
        }

        const currentGenerated = (options.upstreamGeneratedAt.value || '').toString().trim()
        const nextGenerated = (upstreamGeneratedAt || '').toString().trim()
        if (currentGenerated && nextGenerated) {
          const currentGeneratedTime = Date.parse(currentGenerated)
          const nextGeneratedTime = Date.parse(nextGenerated)
          if (
            Number.isFinite(currentGeneratedTime)
            && Number.isFinite(nextGeneratedTime)
            && nextGeneratedTime < currentGeneratedTime
          ) {
            console.warn('Ignored stale queue payload (generated_at regressed):', { currentContextKey, currentGenerated, nextGenerated })
            return
          }
        }
      }
    } catch {}

    const items = rawItems.filter((item) => item && typeof item === 'object')
    const selectedRingText = (options.selectedRing.value || '').toString().trim()
    let filtered = items
    let hasRingMismatch = false

    if (selectedRingText) {
      const ringTextOf = (match: any) => {
        const ringValue = match?.ring_number ?? match?.ringNumber ?? match?.ring_no ?? match?.ringNo ?? null
        if (ringValue == null) return ''
        return String(ringValue).trim()
      }

      const mismatched = items.filter((match: any) => {
        const ringValue = ringTextOf(match)
        return ringValue && ringValue !== selectedRingText
      })
      hasRingMismatch = mismatched.length > 0
      if (mismatched.length) {
        console.warn('Admin queue payload contains items assigned to another ring (controller will filter by ring_number):', {
          selected_ring: selectedRingText,
          mismatched_count: mismatched.length,
          sample: mismatched.slice(0, 3),
        })
      }
      filtered = items.filter((match: any) => {
        const ringValue = ringTextOf(match)
        return !ringValue || ringValue === selectedRingText
      })
    }

    reconcileLocalStatusOverrides(filtered)
    const finalFiltered = applyLocalResultOverrides(filtered)
    const counts = countQueueRows(finalFiltered)

    options.upstreamQueueVersion.value = upstreamVersion
    options.upstreamGeneratedAt.value = upstreamGeneratedAt
    options.controllerGeneratedAt.value = new Date().toISOString()
    options.controllerSnapshotVersion.value = [
      upstreamVersion || 'nover',
      upstreamGeneratedAt || 'nogen',
      String(finalFiltered.length),
      String(finalFiltered[0]?.match_id ?? finalFiltered[0]?.remote_id ?? finalFiltered[0]?.id ?? ''),
      String(finalFiltered[finalFiltered.length - 1]?.match_id ?? finalFiltered[finalFiltered.length - 1]?.remote_id ?? finalFiltered[finalFiltered.length - 1]?.id ?? ''),
    ].filter(Boolean).join('|')

    options.queueSourceMode.value = sourceMode
    options.queueIsDegraded.value = sourceMode !== 'queue_api' || hasRingMismatch
    options.queueDegradedReason.value = options.queueIsDegraded.value
      ? (sourceMode !== 'queue_api' ? (optionsForPayload.degraded_reason ?? 'fallback') : 'ring_number_mismatch_filtered')
      : null
    options.queueVersionGuardContextKey.value = sourceMode === 'queue_api'
      ? (options.liveSnapshotContextKey.value || '')
      : options.queueVersionGuardContextKey.value

    options.queueReadyCount.value = counts.ready
    options.queueProvisionalCount.value = counts.provisional
    options.queueHiddenCount.value = counts.hidden
    options.queueAutoAdvanceCount.value = counts.auto_advance
    options.queueCompletedRemovedCount.value = counts.completed

    options.matchesList.value = finalFiltered
    if (!Array.isArray(options.allMatchesList.value) || options.allMatchesList.value.length === 0) {
      options.allMatchesList.value = finalFiltered
    }
    options.lastSyncAt.value = Date.now()
    const nextMatch = options.matchesList.value.find((match: any) => options.getEffectiveStatus(match).toLowerCase() !== 'completed')
    options.nextUpcomingMatchId.value = nextMatch ? options.getRemoteMatchId(nextMatch) : null
    if (sourceMode === 'queue_api' && !options.queueIsDegraded.value) {
      clearLiveSnapshotRecoveryPending()
    }

    writeLocalCache(finalFiltered, {
      upstream_queue_version: upstreamVersion,
      upstream_generated_at: upstreamGeneratedAt,
      source_mode: sourceMode,
      is_degraded: options.queueIsDegraded.value,
      degraded_reason: options.queueDegradedReason.value,
      ready_count: options.queueReadyCount.value,
      provisional_count: options.queueProvisionalCount.value,
      hidden_count: options.queueHiddenCount.value,
      auto_advance_count: options.queueAutoAdvanceCount.value,
      completed_removed_count: options.queueCompletedRemovedCount.value,
      controller_snapshot_version: options.controllerSnapshotVersion.value,
      controller_generated_at: options.controllerGeneratedAt.value,
    })
  }

  async function checkOnlineStatus() {
    if (options.isCheckingStatus.value) return
    options.isCheckingStatus.value = true
    try {
      let nextOnline = false

      if (options.hasKnownDeviceCredentials.value && options.syncHasServer.value) {
        nextOnline = await options.reconnectKnownDeviceSession(false)
      }

      if (!nextOnline && options.syncHasServer.value) {
        const data = await heartbeat()
        nextOnline = data?.status === 'ok'
      }

      options.isOnline.value = nextOnline
      if (options.lastOnlineState.value !== options.isOnline.value) {
        options.showBanner(`Kurash System: ${options.isOnline.value ? 'Online' : 'Offline'}`, options.isOnline.value ? 'success' : 'error', 2500)
        options.lastOnlineState.value = options.isOnline.value
      }
    } catch (error) {
      console.error('GET', options.localApiUrl('/status').toString(), 'failed', error)
      options.isOnline.value = false
      if (options.lastOnlineState.value !== options.isOnline.value) {
        options.showBanner('Kurash System: Offline', 'error', 2500)
        options.lastOnlineState.value = options.isOnline.value
      }
    } finally {
      options.isCheckingStatus.value = false
    }
  }

  async function loadTournaments() {
    if (options.isLoadingTournaments.value) return
    options.isLoadingTournaments.value = true
    try {
      await checkOnlineStatus()
      const list = await listTournamentsRemote()
      options.tournaments.value = Array.isArray(list) ? list : []
    } catch (error) {
      console.error('GET', options.localApiUrl('/tournaments').toString(), 'failed', error)
      options.tournaments.value = []
      throw error
    } finally {
      options.isLoadingTournaments.value = false
    }
  }

  async function fetchAllTournaments() {
    if (options.isFetchingAll.value || options.isLoadingTournaments.value) return
    options.isFetchingAll.value = true
    try {
      await loadTournaments()
      options.showBanner('Tournaments refreshed', 'success', 2200)
    } catch (error) {
      console.error('GET', options.localApiUrl('/tournaments').toString(), 'failed', error)
      const message = error instanceof Error ? error.message : 'Kurash System fetch failed'
      options.showBanner(message, 'error', 5000)
    } finally {
      options.isFetchingAll.value = false
    }
  }

  async function attemptLiveSnapshotRecovery(config: {
    showBanner?: boolean
    skipOnlineCheck?: boolean
  } = {}) {
    const contextKey = options.liveSnapshotContextKey.value
    const tournamentId = options.effectiveTournamentId.value
    const ringText = options.effectiveRing.value
    if (!contextKey || tournamentId == null || !ringText) return false
    if (options.isLiveSnapshotRecoveryBusy.value || options.isLoadingMatches.value) return false

    options.isLiveSnapshotRecoveryBusy.value = true
    markLiveSnapshotRecoveryPending()

    try {
      if (options.adminBase.value) {
        options.adminBase.value = options.normalizeApiBaseInput(options.adminBase.value)
        options.persistAdminBase()
      }
    } catch (error: any) {
      if (config.showBanner) {
        options.showBanner(error?.message || 'Invalid Admin Host address.', 'error', 4000)
      }
      options.isLiveSnapshotRecoveryBusy.value = false
      return false
    }

    try {
      if (!config.skipOnlineCheck) {
        await checkOnlineStatus()
      }

      if (!options.isOnline.value) {
        if (config.showBanner) {
          options.showBanner('Reconnect to Event Host first to restore the live snapshot.', 'error', 4500)
        }
        return false
      }

      if (options.syncHasServer.value && options.tournaments.value.length === 0) {
        try {
          await loadTournaments()
        } catch {}
      }

      resetLiveSnapshotBaselines()
      if (options.selectedTournamentId.value !== tournamentId) options.selectedTournamentId.value = tournamentId
      if (options.selectedRing.value !== ringText) options.selectedRing.value = ringText

      await fetchScoreboardData({ skipOnlineCheck: true })

      const recovered = options.queueSourceMode.value === 'queue_api' && !options.queueIsDegraded.value
      if (recovered) {
        clearLiveSnapshotRecoveryPending(contextKey)
        if (config.showBanner) options.showBanner('Live snapshot restored from Event Host.', 'success', 2600)
        return true
      }

      markLiveSnapshotRecoveryPending()
      if (config.showBanner) options.showBanner(options.getSyncFallbackReasonLabel(), 'info', 3200)
      return false
    } catch (error: any) {
      markLiveSnapshotRecoveryPending()
      if (config.showBanner) options.showBanner(error?.message || 'Failed to restore the live snapshot.', 'error', 5000)
      return false
    } finally {
      options.isLiveSnapshotRecoveryBusy.value = false
    }
  }

  async function fetchScoreboardData(config: { skipOnlineCheck?: boolean } = {}) {
    if (!options.selectedTournamentId.value) return
    const fetchSeq = ++scoreboardFetchSeq
    options.isLoadingMatches.value = true

    try {
      options.clearLegacyClubBrandingCache()
      if (!config.skipOnlineCheck) {
        await checkOnlineStatus()
      }
      if (fetchSeq !== scoreboardFetchSeq) return

      const tournamentId = options.selectedTournamentId.value
      const tournamentName = getSelectedTournamentName()
      restoreResultOverridesForSelection(tournamentId, options.selectedRing.value)

      let data: { matches: any[]; tournament: any; source: string; scoped_by: string | null } = {
        matches: [],
        tournament: { id: tournamentId, name: tournamentName || 'Tournament' },
        source: 'local',
        scoped_by: null,
      }

      try {
        data = await getScoreboardDataLocal(tournamentId, tournamentName)
        if (fetchSeq !== scoreboardFetchSeq) return
      } catch (localError) {
        console.warn('GET scoreboard-data local fallback failed before queue fetch', localError)
        data.source = 'legacy-adapter'
      }

      options.isUnauthorized.value = false
      options.isLocalData.value = data?.source === 'local'
      options.selectedTournamentSummary.value = data.tournament || null
      let matches = Array.isArray(data?.matches) ? data.matches : []
      options.hydrateFetchedTeamBranding(data, data?.tournament, matches)

      if (data?.scoped_by === 'tournament_name_fallback' && options.isOnline.value && tournamentId && !options.dbSyncedTournaments.value[tournamentId]) {
        await saveTournamentToLocalDb(tournamentId)
        if (fetchSeq !== scoreboardFetchSeq) return
        data = await getScoreboardDataLocal(tournamentId, tournamentName)
        if (fetchSeq !== scoreboardFetchSeq) return
        matches = Array.isArray(data?.matches) ? data.matches : []
        options.isLocalData.value = data?.source === 'local'
        options.selectedTournamentSummary.value = data.tournament || null
      }

      if (!matches.length && options.isOnline.value && tournamentId) {
        await saveTournamentToLocalDb(tournamentId)
        if (fetchSeq !== scoreboardFetchSeq) return
        data = await getScoreboardDataLocal(tournamentId, tournamentName)
        if (fetchSeq !== scoreboardFetchSeq) return
        matches = Array.isArray(data?.matches) ? data.matches : []
      }

      options.warnBracketRingConflicts(matches, tournamentId)
      options.allMatchesList.value = matches

      const ringCountFromTournament = (() => {
        const tournamentObject: any = options.tournaments.value.find((item: any) => Number(item?.id) === Number(tournamentId))
        const raw =
          tournamentObject?.ring_count ??
          tournamentObject?.rings ??
          tournamentObject?.ring ??
          tournamentObject?.mat_count ??
          tournamentObject?.matCount ??
          options.selectedTournamentSummary.value?.ring_count ??
          data?.tournament?.ring_count ??
          data?.tournament?.rings ??
          data?.tournament?.ring ??
          null
        if (Array.isArray(raw)) return raw.length
        const count = Number(raw)
        return Number.isFinite(count) && count > 0 ? Math.floor(count) : 0
      })()

      const ringSet = new Set<string>()
      for (const match of matches) {
        const ringText = options.getMatchRingText(match)
        if (ringText) ringSet.add(ringText)
      }
      let derivedRingOptions: string[] = []
      if (ringCountFromTournament > 0) {
        derivedRingOptions = Array.from({ length: ringCountFromTournament }, (_, index) => String(index + 1))
      } else if (ringSet.size > 1) {
        derivedRingOptions = Array.from(ringSet).sort((left, right) => {
          const leftNumber = Number(left)
          const rightNumber = Number(right)
          if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) return leftNumber - rightNumber
          return left.localeCompare(right)
        })
      }

      if (derivedRingOptions.length > 0) {
        if (fetchSeq !== scoreboardFetchSeq) return
        options.ringOptions.value = derivedRingOptions
      }
      if (options.selectedRing.value && !options.ringOptions.value.includes(options.selectedRing.value) && options.hasAssignedSetup.value) {
        options.ringOptions.value = Array.from(new Set([...options.ringOptions.value, options.selectedRing.value])).sort((left, right) => {
          const leftNumber = Number(left)
          const rightNumber = Number(right)
          if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) return leftNumber - rightNumber
          return left.localeCompare(right)
        })
      }
      if (!options.ringOptions.value.includes(options.selectedRing.value) && !options.hasAssignedSetup.value) {
        if (fetchSeq !== scoreboardFetchSeq) return
        options.manualSelectedRing.value = options.ringOptions.value[0]
        options.persistSelectedRing()
      }

      const selectedRingText = (options.effectiveRing.value || options.selectedRing.value || '').toString().trim()
      if (fetchSeq !== scoreboardFetchSeq) return

      if (options.isOnline.value && selectedRingText) {
        try {
          const queuePayload = await getRingQueueRemote(tournamentId, selectedRingText)
          if (fetchSeq !== scoreboardFetchSeq) return
          options.hydrateFetchedTeamBranding(queuePayload, queuePayload?.tournament, queuePayload?.items as any[] | undefined)
          applyQueuePayload(queuePayload, 'queue_api')
          await options.maybeAutoLoadAssignedMatch(tournamentId, selectedRingText)
          if (fetchSeq !== scoreboardFetchSeq) return
          options.isLocalData.value = false
          return
        } catch (queueError) {
          console.warn('GET ring queue failed; falling back to legacy adapter', queueError)
        }
      }
      if (fetchSeq !== scoreboardFetchSeq) return

      const tournamentIdForFallback = tournamentId
      const allNormalized = (matches || []).map((match: any) => {
        if (!match || typeof match !== 'object') return match
        const nextMatch: any = { ...match }
        if (tournamentIdForFallback != null && nextMatch.tournament_id == null) nextMatch.tournament_id = tournamentIdForFallback
        const ringText = options.getMatchRingText(nextMatch)
        if ((nextMatch.ring_number == null || nextMatch.ring_number === '') && ringText) nextMatch.ring_number = ringText
        const genderRaw = (nextMatch.gender || nextMatch.gender_category || nextMatch.genderCategory || '').toString().toLowerCase()
        if (genderRaw) {
          nextMatch.gender = genderRaw === 'male' || genderRaw === 'm'
            ? 'MEN'
            : (genderRaw === 'female' || genderRaw === 'f' ? 'WOMEN' : nextMatch.gender || genderRaw)
        }
        if (!nextMatch.age_category) {
          nextMatch.age_category = nextMatch.ageCategory || nextMatch.age || nextMatch.division || nextMatch.classification || ''
        }
        return nextMatch
      })
      options.allMatchesList.value = allNormalized

      let normalized: any[] = allNormalized
      const ringCountForFallback = ringCountFromTournament > 0 ? ringCountFromTournament : Math.max(1, options.ringOptions.value.length || 1)
      type BracketRingMeta = {
        rings: Set<string>
        earliestWithRingOrder: number
        earliestWithRingRing: string
        earliestOverallOrder: number
        earliestOverallIdx: number
        sampleMatch: any
        bracketId: string
        bracketLabel: string
      }
      const bracketMeta = new Map<string, BracketRingMeta>()
      const metaOrderVal = (match: any, index: number) => {
        const order = Number(match?.global_match_order ?? match?.match_number ?? match?.match_order)
        if (Number.isFinite(order)) return order
        return 1_000_000_000 + index
      }

      for (let index = 0; index < allNormalized.length; index++) {
        const match: any = allNormalized[index]
        if (!match || typeof match !== 'object') continue
        const key = options.getBracketGroupKey(match)
        const ringText = options.getMatchRingText(match)
        const bracketId = options.getBracketIdText(match)
        const bracketLabel =
          [options.getAgeCategoryLabel(match), options.getWeightCategoryLabel(match)]
            .map((value) => (value || '').toString().trim())
            .filter(Boolean)
            .join(' ')
          || options.getBracketKeyForMatch(match)

        const order = metaOrderVal(match, index)
        const meta = bracketMeta.get(key) || {
          rings: new Set<string>(),
          earliestWithRingOrder: Number.POSITIVE_INFINITY,
          earliestWithRingRing: '',
          earliestOverallOrder: Number.POSITIVE_INFINITY,
          earliestOverallIdx: index,
          sampleMatch: match,
          bracketId: bracketId || '',
          bracketLabel,
        }

        if (bracketId && !meta.bracketId) meta.bracketId = bracketId
        if (!meta.bracketLabel && bracketLabel) meta.bracketLabel = bracketLabel
        if (ringText) meta.rings.add(ringText)

        if (order < meta.earliestOverallOrder) {
          meta.earliestOverallOrder = order
          meta.earliestOverallIdx = index
          meta.sampleMatch = match
        }
        if (ringText && order < meta.earliestWithRingOrder) {
          meta.earliestWithRingOrder = order
          meta.earliestWithRingRing = ringText
        }

        bracketMeta.set(key, meta)
      }

      const bracketRingByKey = new Map<string, string>()
      for (const [key, meta] of bracketMeta) {
        const rings = Array.from(meta.rings)
        if (rings.length > 1) {
          const conflictKey = `${tournamentIdForFallback}|${meta.bracketId || key}`
          if (!options.loggedBracketRingConflicts.has(conflictKey)) {
            options.loggedBracketRingConflicts.add(conflictKey)
            console.warn('Bracket appears in multiple rings (frontend will keep the bracket in one ring):', {
              bracket_id: meta.bracketId || null,
              bracket_label: meta.bracketLabel || null,
              rings,
            })
          }
        }

        let assigned = ''
        if (rings.length === 1) assigned = rings[0]
        else if (rings.length > 1) assigned = meta.earliestWithRingRing || rings[0] || ''

        if (!assigned) {
          assigned = ringCountForFallback > 1
            ? options.getFallbackRingText(meta.sampleMatch, meta.earliestOverallIdx, ringCountForFallback)
            : (options.ringOptions.value[0] || '1')
        }
        if (!assigned) assigned = options.ringOptions.value[0] || '1'
        bracketRingByKey.set(key, assigned)
      }

      for (let index = 0; index < allNormalized.length; index++) {
        const match: any = allNormalized[index]
        if (!match || typeof match !== 'object') continue
        const key = options.getBracketGroupKey(match)
        const originalRing = options.getMatchRingText(match)
        const assigned = bracketRingByKey.get(key)
          || (ringCountForFallback > 1 ? options.getFallbackRingText(match, index, ringCountForFallback) : (options.ringOptions.value[0] || '1'))
        match._ring_original = originalRing || ''
        match._ring_by_bracket = assigned || ''
        match.ring_number = assigned || match.ring_number
      }

      if (selectedRingText) {
        normalized = normalized.filter((match: any) => options.getMatchRingText(match) === selectedRingText)
      }

      const orderVal = (match: any) => {
        const order = Number(match?.global_match_order ?? match?.match_number ?? match?.match_order)
        return Number.isFinite(order) ? order : Number.POSITIVE_INFINITY
      }
      normalized = [...normalized].sort((left: any, right: any) => {
        const leftOrder = orderVal(left)
        const rightOrder = orderVal(right)
        if (leftOrder !== rightOrder) return leftOrder - rightOrder
        const leftId = String(options.getRemoteMatchId(left) ?? '')
        const rightId = String(options.getRemoteMatchId(right) ?? '')
        return leftId.localeCompare(rightId, undefined, { numeric: true })
      })

      if (fetchSeq !== scoreboardFetchSeq) return
      const legacySource: RingQueueSource = 'legacy_adapter'
      const legacyAllRowsRaw = options.normalizeQueueRows(allNormalized, { source: legacySource })
      const legacyRowsRaw = options.normalizeQueueRows(normalized, { source: legacySource })
      reconcileLocalStatusOverrides(legacyRowsRaw)
      const legacyAllRows = applyLocalResultOverrides(legacyAllRowsRaw)
      const legacyRows = applyLocalResultOverrides(legacyRowsRaw)
      const legacyCounts = countQueueRows(legacyRows)

      options.upstreamQueueVersion.value = null
      options.upstreamGeneratedAt.value = null
      options.controllerGeneratedAt.value = new Date().toISOString()
      options.controllerSnapshotVersion.value = [
        'legacy_adapter',
        String(legacyRows.length),
        String(legacyRows[0]?.match_id ?? legacyRows[0]?.remote_id ?? legacyRows[0]?.id ?? ''),
        String(legacyRows[legacyRows.length - 1]?.match_id ?? legacyRows[legacyRows.length - 1]?.remote_id ?? legacyRows[legacyRows.length - 1]?.id ?? ''),
      ].filter(Boolean).join('|')
      options.queueSourceMode.value = legacySource
      options.queueIsDegraded.value = true
      options.queueDegradedReason.value = options.isOnline.value ? 'queue_api_unavailable' : 'offline_legacy_adapter'
      markLiveSnapshotRecoveryPending()
      options.queueReadyCount.value = legacyCounts.ready
      options.queueProvisionalCount.value = legacyCounts.provisional
      options.queueHiddenCount.value = legacyCounts.hidden
      options.queueAutoAdvanceCount.value = legacyCounts.auto_advance
      options.queueCompletedRemovedCount.value = legacyCounts.completed

      writeLocalCache(legacyRows, {
        source_mode: legacySource,
        is_degraded: true,
        degraded_reason: options.queueDegradedReason.value,
        ready_count: options.queueReadyCount.value,
        provisional_count: options.queueProvisionalCount.value,
        hidden_count: options.queueHiddenCount.value,
        auto_advance_count: options.queueAutoAdvanceCount.value,
        completed_removed_count: options.queueCompletedRemovedCount.value,
        controller_snapshot_version: options.controllerSnapshotVersion.value,
        controller_generated_at: options.controllerGeneratedAt.value,
      })
      options.matchesList.value = legacyRows
      options.allMatchesList.value = legacyAllRows
      options.lastSyncAt.value = Date.now()
      const nextMatch = options.matchesList.value.find((match: any) => options.getEffectiveStatus(match).toLowerCase() !== 'completed')
      options.nextUpcomingMatchId.value = nextMatch ? options.getRemoteMatchId(nextMatch) : null
    } catch (error) {
      if (fetchSeq !== scoreboardFetchSeq) return
      console.error('GET scoreboard-data failed', error)
      const message = error instanceof Error ? error.message : 'Failed to load matches for this ring'
      options.showBanner(`Sync: ${message}.`, 'error', 6500)
      try {
        const cached = readQueueCacheFromStorage(options.getStorage(), selectionSnapshotScopeKey())
        if (cached) {
          reconcileLocalStatusOverrides(cached.items)
          const cachedItems = applyLocalResultOverrides(cached.items)
          const cachedCounts = countQueueRows(cachedItems)
          options.matchesList.value = cachedItems
          options.allMatchesList.value = cachedItems
          options.isLocalData.value = true
          options.lastSyncAt.value = cached.lastSyncAt ?? Date.now()
          options.upstreamQueueVersion.value = cached.upstreamQueueVersion
          options.upstreamGeneratedAt.value = cached.upstreamGeneratedAt
          options.controllerSnapshotVersion.value = cached.controllerSnapshotVersion
          options.controllerGeneratedAt.value = cached.controllerGeneratedAt
          options.queueSourceMode.value = getCachedSourceMode(options.isOnline.value)
          options.queueIsDegraded.value = true
          options.queueDegradedReason.value = options.queueSourceMode.value === 'offline_cache' ? 'offline_cache' : 'cached_queue'
          markLiveSnapshotRecoveryPending()
          options.queueReadyCount.value = cachedCounts.ready
          options.queueProvisionalCount.value = cachedCounts.provisional
          options.queueHiddenCount.value = cachedCounts.hidden
          options.queueAutoAdvanceCount.value = cachedCounts.auto_advance
          options.queueCompletedRemovedCount.value = cachedCounts.completed
          const nextMatch = options.matchesList.value.find((match: any) => options.getEffectiveStatus(match).toLowerCase() !== 'completed')
          options.nextUpcomingMatchId.value = nextMatch ? options.getRemoteMatchId(nextMatch) : null
        }
      } catch {}
    } finally {
      if (fetchSeq === scoreboardFetchSeq) {
        options.isLoadingMatches.value = false
      }
    }
  }

  return {
    getTournamentNameById,
    getSelectedTournamentName,
    selectionSnapshotScopeKey,
    persistResultOverridesForSelection,
    restoreResultOverridesForSelection,
    upsertLocalResultOverride,
    applyLocalResultOverrides,
    countQueueRows,
    reconcileLocalStatusOverrides,
    resetQueueMeta,
    resetLiveSnapshotBaselines,
    markLiveSnapshotRecoveryPending,
    clearLiveSnapshotRecoveryPending,
    readLocalCacheMeta,
    writeLocalCache,
    heartbeat,
    listTournamentsRemote,
    getScoreboardDataLocal,
    syncTournamentRemote,
    saveTournamentToLocalDb,
    getRingQueueRemote,
    applyQueuePayload,
    checkOnlineStatus,
    loadTournaments,
    fetchAllTournaments,
    attemptLiveSnapshotRecovery,
    fetchScoreboardData,
  }
}
