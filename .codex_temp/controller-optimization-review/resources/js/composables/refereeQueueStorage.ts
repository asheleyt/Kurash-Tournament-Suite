import type { RingQueueSource } from '@/composables/useRingDisplayQueue'
import { buildQueueCacheStorageKey } from '@/composables/refereeQueueOverrides'

export interface QueueCacheStateSnapshot {
  upstreamQueueVersion?: string | null
  upstreamGeneratedAt?: string | null
  sourceMode?: RingQueueSource | null
  isDegraded?: boolean
  degradedReason?: string | null
  readyCount?: number
  provisionalCount?: number
  hiddenCount?: number
  autoAdvanceCount?: number
  completedRemovedCount?: number
  controllerSnapshotVersion?: string | null
  controllerGeneratedAt?: string | null
}

export interface ParsedQueueCachePayload {
  items: any[]
  lastSyncAt: number | null
  upstreamQueueVersion: string | null
  upstreamGeneratedAt: string | null
  controllerSnapshotVersion: string | null
  controllerGeneratedAt: string | null
  readyCount: number
  provisionalCount: number
  hiddenCount: number
  autoAdvanceCount: number
  completedRemovedCount: number
}

export function readQueueCacheFromStorage(storage: Storage | null, scopeKey: string): ParsedQueueCachePayload | null {
  const storageKey = buildQueueCacheStorageKey(scopeKey)
  if (!storage || !storageKey) return null

  try {
    const raw = storage.getItem(storageKey)
    if (!raw) return null

    const obj = JSON.parse(raw)
    const controller = (obj?.controller && typeof obj.controller === 'object') ? obj.controller : null
    const upstream = (obj?.upstream && typeof obj.upstream === 'object') ? obj.upstream : null
    const ts =
      (typeof controller?.ts === 'number' ? controller.ts : null)
      ?? (typeof obj?.ts === 'number' ? obj.ts : null)
      ?? null

    return {
      items: Array.isArray(obj?.items) ? obj.items : (Array.isArray(obj?.matches) ? obj.matches : []),
      lastSyncAt: ts,
      upstreamQueueVersion:
        (typeof upstream?.queue_version === 'string' ? upstream.queue_version : null)
        ?? (typeof obj?.queueVersion === 'string' ? obj.queueVersion : null)
        ?? null,
      upstreamGeneratedAt:
        (typeof upstream?.generated_at === 'string' ? upstream.generated_at : null)
        ?? (typeof obj?.generatedAt === 'string' ? obj.generatedAt : null)
        ?? null,
      controllerSnapshotVersion:
        (typeof controller?.snapshot_version === 'string' ? controller.snapshot_version : null)
        ?? (typeof obj?.controllerSnapshotVersion === 'string' ? obj.controllerSnapshotVersion : null)
        ?? null,
      controllerGeneratedAt:
        (typeof controller?.generated_at === 'string' ? controller.generated_at : null)
        ?? (ts ? new Date(ts).toISOString() : null)
        ?? null,
      readyCount:
        (typeof upstream?.ready_count === 'number' ? upstream.ready_count : null)
        ?? (typeof obj?.readyCount === 'number' ? obj.readyCount : null)
        ?? 0,
      provisionalCount:
        (typeof upstream?.provisional_count === 'number' ? upstream.provisional_count : null)
        ?? (typeof obj?.provisionalCount === 'number' ? obj.provisionalCount : null)
        ?? 0,
      hiddenCount:
        (typeof upstream?.hidden_count === 'number' ? upstream.hidden_count : null)
        ?? (typeof obj?.hiddenCount === 'number' ? obj.hiddenCount : null)
        ?? 0,
      autoAdvanceCount:
        (typeof upstream?.auto_advance_count === 'number' ? upstream.auto_advance_count : null)
        ?? (typeof obj?.autoAdvanceCount === 'number' ? obj.autoAdvanceCount : null)
        ?? 0,
      completedRemovedCount:
        (typeof upstream?.completed_removed_count === 'number' ? upstream.completed_removed_count : null)
        ?? (typeof obj?.completedRemovedCount === 'number' ? obj.completedRemovedCount : null)
        ?? 0,
    }
  } catch {
    return null
  }
}

export function writeQueueCacheToStorage(
  storage: Storage | null,
  scopeKey: string,
  items: any[],
  snapshot: QueueCacheStateSnapshot = {},
) {
  const storageKey = buildQueueCacheStorageKey(scopeKey)
  if (!storage || !storageKey) return null

  try {
    const controllerTs = Date.now()
    const controllerGeneratedAt = snapshot.controllerGeneratedAt ?? new Date(controllerTs).toISOString()
    const payload = {
      controller: {
        ts: controllerTs,
        generated_at: controllerGeneratedAt,
        snapshot_version: snapshot.controllerSnapshotVersion ?? null,
        source_mode: snapshot.sourceMode ?? null,
        is_degraded: snapshot.isDegraded ?? false,
        degraded_reason: snapshot.degradedReason ?? null,
      },
      upstream: {
        queue_version: snapshot.upstreamQueueVersion ?? null,
        generated_at: snapshot.upstreamGeneratedAt ?? null,
        ready_count: snapshot.readyCount ?? 0,
        provisional_count: snapshot.provisionalCount ?? 0,
        hidden_count: snapshot.hiddenCount ?? 0,
        auto_advance_count: snapshot.autoAdvanceCount ?? 0,
        completed_removed_count: snapshot.completedRemovedCount ?? 0,
      },
      items: Array.isArray(items) ? items : [],
    }

    storage.setItem(storageKey, JSON.stringify(payload))
    return controllerTs
  } catch {
    return null
  }
}
