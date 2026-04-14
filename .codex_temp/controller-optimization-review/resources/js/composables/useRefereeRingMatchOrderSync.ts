import { ref } from 'vue'
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

export function useRefereeRingMatchOrderSync(options: UseRefereeRingMatchOrderSyncOptions) {
  const ringMatchOrderChannel = typeof BroadcastChannel !== 'undefined'
    ? new BroadcastChannel(RING_MATCH_ORDER_PROJECTION_CHANNEL)
    : null
  const ringMatchOrderProjectionRecord = ref<RingMatchOrderProjectionRecord | null>(null)
  const ringMatchOrderProjectionLastAttemptAt = ref<number | null>(null)
  let ringMatchOrderPollTimerId: number | null = null
  let ringMatchOrderPollInFlight = false

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
    writeRingMatchOrderProjectionMeta(meta)
    broadcastRingMatchOrderProjectionMessage('ring_match_order:config', { meta })
  }

  function persistRingMatchOrderProjectionRecord(record: RingMatchOrderProjectionRecord) {
    ringMatchOrderProjectionRecord.value = record
    writeRingMatchOrderProjectionRecord(record)
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

  function pickAutoLoadQueueItem(payload: Record<string, unknown>) {
    const items = Array.isArray(payload?.items)
      ? payload.items.filter((item) => item && typeof item === 'object') as any[]
      : []
    const readyItem = items.find((item) => {
      const displayClass = (item?.display_class ?? item?.displayClass ?? '').toString().trim().toUpperCase()
      return displayClass === 'READY' && options.canLoadMatch(item)
    })
    if (readyItem) return readyItem
    return items.find((item) => options.canLoadMatch(item)) ?? null
  }

  async function fetchRingMatchOrderProjectionOnce() {
    if (ringMatchOrderPollInFlight) return
    const meta = options.getRingMatchOrderProjectionMeta()
    const selectedTournamentId = options.getSelectedTournamentId()
    const selectedRing = options.getSelectedRing()
    if (!meta || !selectedTournamentId || !(selectedRing || '').toString().trim()) return

    ringMatchOrderPollInFlight = true
    const keyAtStart = meta.key
    const attemptAt = Date.now()
    ringMatchOrderProjectionLastAttemptAt.value = attemptAt

    try {
      const payload = await getRingDisplayBatchRemote(selectedTournamentId, selectedRing)
      if (options.getRingMatchOrderProjectionKey() !== keyAtStart) return

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

      persistRingMatchOrderProjectionRecord(nextRecord)
      publishRingMatchOrderProjectionConfig(nextRecord.meta)
      broadcastRingMatchOrderProjectionMessage('ring_match_order:update', {
        meta: nextRecord.meta,
        entry: nextRecord,
      })
    } catch (error: any) {
      if (options.getRingMatchOrderProjectionKey() !== keyAtStart) return

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

      persistRingMatchOrderProjectionRecord(fallbackRecord)
      publishRingMatchOrderProjectionConfig(fallbackRecord.meta)
      broadcastRingMatchOrderProjectionMessage('ring_match_order:error', {
        meta: fallbackRecord.meta,
        entry: fallbackRecord,
      })
    } finally {
      ringMatchOrderPollInFlight = false
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
    publishRingMatchOrderProjectionConfig(meta)

    if (!meta) {
      stopRingMatchOrderProjectionPoller()
      ringMatchOrderProjectionRecord.value = null
      return
    }

    if (!options.isRingMatchOrderLive()) {
      stopRingMatchOrderProjectionPoller()
      return
    }

    if (ringMatchOrderPollTimerId != null) return

    void fetchRingMatchOrderProjectionOnce()
    ringMatchOrderPollTimerId = window.setInterval(() => {
      void fetchRingMatchOrderProjectionOnce()
    }, 5000)
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
    getRingDisplayBatchRemote,
    pickAutoLoadQueueItem,
    fetchRingMatchOrderProjectionOnce,
    stopRingMatchOrderProjectionPoller,
    syncRingMatchOrderProjectionPolling,
    disposeRingMatchOrderSync,
  }
}
