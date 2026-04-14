import { ref } from 'vue'
import {
  logControllerPerfSummary,
  nowPerfMs,
  type ControllerPerfBroadcastAction,
  type ControllerPerfStorageAction,
} from '@/composables/controllerPerfDebug'
import {
  createRingMatchOrderProjectionRecord,
  RING_MATCH_ORDER_PROJECTION_CHANNEL,
  type RingMatchOrderProjectionMeta,
  type RingMatchOrderProjectionRecord,
  writeRingMatchOrderProjectionMeta,
  writeRingMatchOrderProjectionRecord,
} from '@/composables/useRingMatchOrderProjection'

interface UseRefereeRingMatchOrderSyncOptions {
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
  getRingMatchOrderProjectionMeta: () => RingMatchOrderProjectionMeta | null
  getRingMatchOrderProjectionKey: () => string
  getSelectedTournamentId: () => number | null
  getSelectedRing: () => string
  isRingMatchOrderLive: () => boolean
  canLoadMatch: (item: any) => boolean
}

type RingPerfSkipReason = 'none' | 'not_live' | 'no_meta' | 'unchanged_payload' | 'error'

interface RingPerfSummary {
  fetchDurationMs: number
  applyDurationMs: number
  storage: ControllerPerfStorageAction
  broadcast: ControllerPerfBroadcastAction
  skip: RingPerfSkipReason
}

const RING_MATCH_ORDER_POLL_INTERVAL_MS = 5000

function createRingPerfSummary(): RingPerfSummary {
  return {
    fetchDurationMs: 0,
    applyDurationMs: 0,
    storage: 'skip',
    broadcast: 'skip',
    skip: 'none',
  }
}

function serializeRingMatchOrderProjectionMetaMaterial(meta: RingMatchOrderProjectionMeta | null) {
  if (!meta) return 'null'

  return JSON.stringify({
    key: meta.key,
    adminBaseNormalized: (meta.adminBaseNormalized || '').toString().trim(),
    tournamentId: meta.tournamentId == null ? null : meta.tournamentId,
    tournamentName: (meta.tournamentName || '').toString().trim(),
    ring: (meta.ring || '').toString().trim(),
    snapshotId: meta.snapshotId == null ? null : meta.snapshotId,
  })
}

function serializeRingMatchOrderProjectionRecordMaterial(record: RingMatchOrderProjectionRecord | null) {
  if (!record) return 'null'

  return JSON.stringify({
    key: record.key,
    payload: record.payload ?? null,
    lastError: record.lastError ?? null,
    meta: record.meta
      ? {
          key: record.meta.key,
          adminBaseNormalized: (record.meta.adminBaseNormalized || '').toString().trim(),
          tournamentId: record.meta.tournamentId == null ? null : record.meta.tournamentId,
          tournamentName: (record.meta.tournamentName || '').toString().trim(),
          ring: (record.meta.ring || '').toString().trim(),
          snapshotId: record.meta.snapshotId == null ? null : record.meta.snapshotId,
        }
      : null,
  })
}

export function useRefereeRingMatchOrderSync(options: UseRefereeRingMatchOrderSyncOptions) {
  const ringMatchOrderChannel = typeof BroadcastChannel !== 'undefined'
    ? new BroadcastChannel(RING_MATCH_ORDER_PROJECTION_CHANNEL)
    : null
  const ringMatchOrderProjectionRecord = ref<RingMatchOrderProjectionRecord | null>(null)
  const ringMatchOrderProjectionLastAttemptAt = ref<number | null>(null)
  let ringMatchOrderPollTimerId: number | null = null
  let ringMatchOrderPollInFlight = false
  let lastPublishedProjectionConfigSignature = serializeRingMatchOrderProjectionMetaMaterial(null)
  let lastPersistedProjectionRecordSignature = serializeRingMatchOrderProjectionRecordMaterial(null)

  function logRingPerfSummary(summary: RingPerfSummary) {
    logControllerPerfSummary('ring', {
      fetchDurationMs: summary.fetchDurationMs,
      applyDurationMs: summary.applyDurationMs,
      storage: summary.storage,
      broadcast: summary.broadcast,
      skip: summary.skip,
    })
  }

  function broadcastRingMatchOrderProjectionMessage(
    type: 'ring_match_order:config' | 'ring_match_order:update' | 'ring_match_order:error',
    payload: {
      meta?: RingMatchOrderProjectionMeta | null
      entry?: RingMatchOrderProjectionRecord | null
    },
  ) {
    try {
      ringMatchOrderChannel?.postMessage({
        type,
        meta: payload.meta ?? null,
        entry: payload.entry ?? null,
      })
    } catch (error) {
      console.error('Failed to publish Gilam Match Order projection update', error)
    }
  }

  function publishRingMatchOrderProjectionConfig(meta: RingMatchOrderProjectionMeta | null) {
    const nextSignature = serializeRingMatchOrderProjectionMetaMaterial(meta)
    if (nextSignature === lastPublishedProjectionConfigSignature) {
      return {
        storage: 'skip',
        broadcast: 'skip',
      } satisfies {
        storage: ControllerPerfStorageAction
        broadcast: ControllerPerfBroadcastAction
      }
    }

    lastPublishedProjectionConfigSignature = nextSignature
    writeRingMatchOrderProjectionMeta(meta)
    broadcastRingMatchOrderProjectionMessage('ring_match_order:config', { meta })
    return {
      storage: 'write',
      broadcast: 'write',
    } satisfies {
      storage: ControllerPerfStorageAction
      broadcast: ControllerPerfBroadcastAction
    }
  }

  function persistRingMatchOrderProjectionRecord(record: RingMatchOrderProjectionRecord) {
    ringMatchOrderProjectionRecord.value = record
    const nextSignature = serializeRingMatchOrderProjectionRecordMaterial(record)
    if (nextSignature === lastPersistedProjectionRecordSignature) {
      return 'skip' as const
    }

    lastPersistedProjectionRecordSignature = nextSignature
    writeRingMatchOrderProjectionRecord(record)
    return 'write' as const
  }

  function publishRingMatchOrderProjectionRecord(
    record: RingMatchOrderProjectionRecord,
    type: 'ring_match_order:update' | 'ring_match_order:error' = 'ring_match_order:update',
  ) {
    const recordStorageAction = persistRingMatchOrderProjectionRecord(record)
    const configAction = publishRingMatchOrderProjectionConfig(record.meta)
    if (recordStorageAction === 'write') {
      broadcastRingMatchOrderProjectionMessage(type, {
        meta: record.meta,
        entry: record,
      })
    }

    return {
      storage: recordStorageAction === 'write' || configAction.storage === 'write' ? 'write' : 'skip',
      broadcast: recordStorageAction === 'write' || configAction.broadcast === 'write' ? 'write' : 'skip',
    } satisfies {
      storage: ControllerPerfStorageAction
      broadcast: ControllerPerfBroadcastAction
    }
  }

  function publishRingMatchOrderProjectionPayload(
    payload: Record<string, unknown> | null,
    publishOptions: {
      attemptedAt?: number | null
      lastError?: string | null
    } = {},
  ) {
    const meta = options.getRingMatchOrderProjectionMeta()
    const key = options.getRingMatchOrderProjectionKey()
    if (!meta || !key) {
      return {
        storage: 'skip',
        broadcast: 'skip',
      } satisfies {
        storage: ControllerPerfStorageAction
        broadcast: ControllerPerfBroadcastAction
      }
    }

    const attemptAt = typeof publishOptions.attemptedAt === 'number'
      ? publishOptions.attemptedAt
      : Date.now()
    const nextRecord = createRingMatchOrderProjectionRecord(
      key,
      payload,
      {
        ...meta,
        updatedAt: attemptAt,
      },
      {
        lastSuccessAt: publishOptions.lastError
          ? (ringMatchOrderProjectionRecord.value?.key === key
            ? (ringMatchOrderProjectionRecord.value?.lastSuccessAt ?? null)
            : null)
          : attemptAt,
        lastAttemptAt: attemptAt,
        lastError: publishOptions.lastError ?? null,
      },
    )

    return publishRingMatchOrderProjectionRecord(
      nextRecord,
      publishOptions.lastError ? 'ring_match_order:error' : 'ring_match_order:update',
    )
  }

  async function getRingDisplayBatchRemote(id: number, ring: string) {
    await options.ensureConfigLoaded()
    const ringText = (ring || '').toString().trim()
    if (!ringText) throw new Error('Gilam is required')

    const url = options.localApiUrl(`/tournaments/${id}/rings/${ringText}/display-batch`)
    options.attachAdminBase(url)
    url.searchParams.set('limit', '5')

    const res = await fetch(url.toString(), { headers: options.headers() })
    const body = await res.text()
    if (!res.ok) {
      options.reportFetchFailure('Gilam Match Order', url.toString(), res.status, body, { notify: true })
      throw new Error(`Gilam Match Order failed: ${res.status}. ${options.safeApiErrorMessage(res.status, body)}`)
    }

    let json: Record<string, unknown>
    try {
      json = JSON.parse(body) as Record<string, unknown>
    } catch {
      throw new Error(`Gilam Match Order: response was not JSON (${res.status}). ${options.safeApiErrorMessage(res.status, body)}`)
    }

    if (json?.success === false) {
      const message = typeof json?.message === 'string' ? json.message : 'Gilam Match Order endpoint rejected the request'
      throw new Error(message)
    }

    return json
  }

  function pickAutoLoadQueueItem(
    payload: Record<string, unknown>,
    pickOptions: {
      excludeMatchId?: number | string | null
    } = {},
  ) {
    const items = Array.isArray(payload?.items)
      ? payload.items.filter((item) => item && typeof item === 'object') as any[]
      : []
    const excludedMatchId = pickOptions.excludeMatchId
    const isExcluded = (item: any) => {
      if (excludedMatchId == null) return false
      const itemId =
        item?.remote_id ??
        item?.remoteId ??
        item?.match_id ??
        item?.matchId ??
        item?.id ??
        null
      return itemId != null && String(itemId) === String(excludedMatchId)
    }
    const readyItem = items.find((item) => {
      const displayClass = (item?.display_class ?? item?.displayClass ?? '').toString().trim().toUpperCase()
      return !isExcluded(item) && displayClass === 'READY' && options.canLoadMatch(item)
    })
    if (readyItem) return readyItem

    const provisionalItem = items.find((item) => {
      const displayClass = (item?.display_class ?? item?.displayClass ?? '').toString().trim().toUpperCase()
      return !isExcluded(item) && displayClass === 'PROVISIONAL' && options.canLoadMatch(item)
    })
    if (provisionalItem) return provisionalItem

    return items.find((item) => {
      if (isExcluded(item) || !options.canLoadMatch(item)) return false
      const displayClass = (item?.display_class ?? item?.displayClass ?? '').toString().trim().toUpperCase()
      const status = (item?.status ?? '').toString().trim().toLowerCase()
      if (status === 'completed') return false
      return displayClass !== 'COMPLETED' && displayClass !== 'HIDDEN' && displayClass !== 'AUTO_ADVANCE'
    }) ?? null
  }

  async function fetchRingMatchOrderProjectionOnce() {
    if (ringMatchOrderPollInFlight) return
    const meta = options.getRingMatchOrderProjectionMeta()
    const selectedTournamentId = options.getSelectedTournamentId()
    const selectedRing = options.getSelectedRing()
    if (!meta || !selectedTournamentId || !(selectedRing || '').toString().trim()) {
      logRingPerfSummary({
        fetchDurationMs: 0,
        applyDurationMs: 0,
        storage: 'skip',
        broadcast: 'skip',
        skip: 'no_meta',
      })
      return
    }

    if (!options.isRingMatchOrderLive()) {
      logRingPerfSummary({
        fetchDurationMs: 0,
        applyDurationMs: 0,
        storage: 'skip',
        broadcast: 'skip',
        skip: 'not_live',
      })
      return
    }

    ringMatchOrderPollInFlight = true
    const keyAtStart = meta.key
    const attemptAt = Date.now()
    const fetchStartedAt = nowPerfMs()
    const perfSummary = createRingPerfSummary()
    let shouldLogPerfSummary = true
    ringMatchOrderProjectionLastAttemptAt.value = attemptAt

    try {
      const payload = await getRingDisplayBatchRemote(selectedTournamentId, selectedRing)
      perfSummary.fetchDurationMs = nowPerfMs() - fetchStartedAt
      if (options.getRingMatchOrderProjectionKey() !== keyAtStart) {
        shouldLogPerfSummary = false
        return
      }

      const applyStartedAt = nowPerfMs()
      const nextRecord = createRingMatchOrderProjectionRecord(
        keyAtStart,
        payload,
        {
          ...meta,
          updatedAt: attemptAt,
        },
        {
          lastSuccessAt: attemptAt,
          lastAttemptAt: attemptAt,
          lastError: null,
        },
      )

      const publishResult = publishRingMatchOrderProjectionRecord(nextRecord, 'ring_match_order:update')

      perfSummary.applyDurationMs = nowPerfMs() - applyStartedAt
      perfSummary.storage = publishResult.storage
      perfSummary.broadcast = publishResult.broadcast
      perfSummary.skip = publishResult.storage === 'write' ? 'none' : 'unchanged_payload'
    } catch (error: any) {
      perfSummary.fetchDurationMs = nowPerfMs() - fetchStartedAt
      if (options.getRingMatchOrderProjectionKey() !== keyAtStart) {
        shouldLogPerfSummary = false
        return
      }

      const applyStartedAt = nowPerfMs()
      const fallbackRecord = createRingMatchOrderProjectionRecord(
        keyAtStart,
        ringMatchOrderProjectionRecord.value?.key === keyAtStart
          ? (ringMatchOrderProjectionRecord.value?.payload ?? null)
          : null,
        {
          ...meta,
          updatedAt: attemptAt,
        },
        {
          lastSuccessAt: ringMatchOrderProjectionRecord.value?.key === keyAtStart
            ? (ringMatchOrderProjectionRecord.value?.lastSuccessAt ?? null)
            : null,
          lastAttemptAt: attemptAt,
          lastError: error?.message || 'Projection refresh failed.',
        },
      )

      const publishResult = publishRingMatchOrderProjectionRecord(fallbackRecord, 'ring_match_order:error')

      perfSummary.applyDurationMs = nowPerfMs() - applyStartedAt
      perfSummary.storage = publishResult.storage
      perfSummary.broadcast = publishResult.broadcast
      perfSummary.skip = 'error'
    } finally {
      ringMatchOrderPollInFlight = false
      if (shouldLogPerfSummary) {
        logRingPerfSummary(perfSummary)
      }
    }
  }

  function stopRingMatchOrderProjectionPoller() {
    if (ringMatchOrderPollTimerId != null) {
      window.clearInterval(ringMatchOrderPollTimerId)
      ringMatchOrderPollTimerId = null
    }
  }

  function syncRingMatchOrderProjectionPolling() {
    const meta = options.getRingMatchOrderProjectionMeta()
    const configAction = publishRingMatchOrderProjectionConfig(meta)

    if (!meta) {
      stopRingMatchOrderProjectionPoller()
      ringMatchOrderProjectionRecord.value = null
      lastPersistedProjectionRecordSignature = serializeRingMatchOrderProjectionRecordMaterial(null)
      logRingPerfSummary({
        fetchDurationMs: 0,
        applyDurationMs: 0,
        storage: configAction.storage,
        broadcast: configAction.broadcast,
        skip: 'no_meta',
      })
      return
    }

    if (!options.isRingMatchOrderLive()) {
      stopRingMatchOrderProjectionPoller()
      logRingPerfSummary({
        fetchDurationMs: 0,
        applyDurationMs: 0,
        storage: configAction.storage,
        broadcast: configAction.broadcast,
        skip: 'not_live',
      })
      return
    }

    if (ringMatchOrderPollTimerId != null) return

    void fetchRingMatchOrderProjectionOnce()
    ringMatchOrderPollTimerId = window.setInterval(() => {
      void fetchRingMatchOrderProjectionOnce()
    }, RING_MATCH_ORDER_POLL_INTERVAL_MS)
  }

  function disposeRingMatchOrderSync() {
    stopRingMatchOrderProjectionPoller()
    ringMatchOrderChannel?.close()
  }

  return {
    ringMatchOrderProjectionRecord,
    ringMatchOrderProjectionLastAttemptAt,
    publishRingMatchOrderProjectionConfig,
    persistRingMatchOrderProjectionRecord,
    publishRingMatchOrderProjectionRecord,
    publishRingMatchOrderProjectionPayload,
    getRingDisplayBatchRemote,
    pickAutoLoadQueueItem,
    fetchRingMatchOrderProjectionOnce,
    stopRingMatchOrderProjectionPoller,
    syncRingMatchOrderProjectionPolling,
    disposeRingMatchOrderSync,
  }
}
