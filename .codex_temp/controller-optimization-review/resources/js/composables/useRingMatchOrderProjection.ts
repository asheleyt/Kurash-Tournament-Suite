export type ElectronDisplayRole = 'scoreboard' | 'ring_match_order'

export interface RingMatchOrderProjectionMeta {
  key: string
  adminBaseNormalized: string
  tournamentId: number | string | null
  tournamentName: string
  ring: string
  snapshotId: number | string | null
  updatedAt: number
}

export interface RingMatchOrderProjectionRecord {
  key: string
  payload: Record<string, unknown> | null
  lastSuccessAt: number | null
  lastAttemptAt: number | null
  lastError: string | null
  meta: RingMatchOrderProjectionMeta | null
}

export const RING_MATCH_ORDER_PROJECTION_CHANNEL = 'kurash:ring-match-order:v1'
export const RING_MATCH_ORDER_CURRENT_META_STORAGE_KEY = 'kurash:ring-match-order:current'
export const RING_MATCH_ORDER_CACHE_PREFIX = 'kurash:ring-match-order:cache:'
export const RING_MATCH_ORDER_FRESH_MS = 15_000
export const RING_MATCH_ORDER_OFFLINE_MS = 60_000

function getLocalStorageSafe(): Storage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

export function normalizeProjectionAdminBase(value: string | null | undefined): string {
  return (value || '').toString().trim().replace(/\/+$/, '')
}

export function buildRingMatchOrderProjectionKey(
  adminBase: string | null | undefined,
  tournamentId: number | string | null | undefined,
  ring: string | number | null | undefined,
  snapshotId?: number | string | null | undefined,
) {
  const adminBaseNormalized = normalizeProjectionAdminBase(adminBase)
  const tournamentText = tournamentId == null || tournamentId === '' ? '' : String(tournamentId).trim()
  const ringText = ring == null || ring === '' ? '' : String(ring).trim()
  const snapshotText = snapshotId == null || snapshotId === '' ? 'nosnapshot' : String(snapshotId).trim()
  if (!adminBaseNormalized || !tournamentText || !ringText) return ''
  return `v2|${adminBaseNormalized}|${snapshotText}|${tournamentText}|${ringText}`
}

export function getRingMatchOrderProjectionStorageKey(key: string) {
  return `${RING_MATCH_ORDER_CACHE_PREFIX}${key}`
}

export function createRingMatchOrderProjectionRecord(
  key: string,
  payload: Record<string, unknown> | null,
  meta: RingMatchOrderProjectionMeta | null,
  timestamps: {
    lastSuccessAt?: number | null
    lastAttemptAt?: number | null
    lastError?: string | null
  } = {},
): RingMatchOrderProjectionRecord {
  return {
    key,
    payload: payload && typeof payload === 'object' ? payload : null,
    lastSuccessAt: typeof timestamps.lastSuccessAt === 'number' ? timestamps.lastSuccessAt : null,
    lastAttemptAt: typeof timestamps.lastAttemptAt === 'number' ? timestamps.lastAttemptAt : null,
    lastError: typeof timestamps.lastError === 'string' && timestamps.lastError.trim()
      ? timestamps.lastError.trim()
      : null,
    meta: meta && typeof meta === 'object'
      ? {
          key,
          adminBaseNormalized: normalizeProjectionAdminBase(meta.adminBaseNormalized),
          tournamentId: meta.tournamentId == null ? null : meta.tournamentId,
          tournamentName: (meta.tournamentName || '').toString().trim(),
          ring: (meta.ring || '').toString().trim(),
          snapshotId: meta.snapshotId == null ? null : meta.snapshotId,
          updatedAt: typeof meta.updatedAt === 'number' ? meta.updatedAt : Date.now(),
        }
      : null,
  }
}

export function safeParseRingMatchOrderProjectionRecord(raw: string | null) {
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as Partial<RingMatchOrderProjectionRecord>
    if (!parsed || typeof parsed !== 'object') return null
    const key = (parsed.key || '').toString().trim()
    if (!key) return null
    return createRingMatchOrderProjectionRecord(
      key,
      parsed.payload && typeof parsed.payload === 'object' ? parsed.payload as Record<string, unknown> : null,
      parsed.meta ?? null,
      {
        lastSuccessAt: typeof parsed.lastSuccessAt === 'number' ? parsed.lastSuccessAt : null,
        lastAttemptAt: typeof parsed.lastAttemptAt === 'number' ? parsed.lastAttemptAt : null,
        lastError: typeof parsed.lastError === 'string' ? parsed.lastError : null,
      },
    )
  } catch {
    return null
  }
}

export function readRingMatchOrderProjectionRecord(key: string) {
  const storage = getLocalStorageSafe()
  if (!storage || !key) return null
  return safeParseRingMatchOrderProjectionRecord(storage.getItem(getRingMatchOrderProjectionStorageKey(key)))
}

export function writeRingMatchOrderProjectionRecord(record: RingMatchOrderProjectionRecord) {
  const storage = getLocalStorageSafe()
  if (!storage || !record?.key) return
  storage.setItem(getRingMatchOrderProjectionStorageKey(record.key), JSON.stringify(record))
}

export function readRingMatchOrderProjectionMeta() {
  const storage = getLocalStorageSafe()
  if (!storage) return null

  try {
    const raw = storage.getItem(RING_MATCH_ORDER_CURRENT_META_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<RingMatchOrderProjectionMeta>
    const key = (parsed?.key || '').toString().trim()
    if (!key) return null
    return {
      key,
      adminBaseNormalized: normalizeProjectionAdminBase(parsed?.adminBaseNormalized),
      tournamentId: parsed?.tournamentId == null ? null : parsed.tournamentId,
      tournamentName: (parsed?.tournamentName || '').toString().trim(),
      ring: (parsed?.ring || '').toString().trim(),
      snapshotId: parsed?.snapshotId == null ? null : parsed.snapshotId,
      updatedAt: typeof parsed?.updatedAt === 'number' ? parsed.updatedAt : Date.now(),
    } satisfies RingMatchOrderProjectionMeta
  } catch {
    return null
  }
}

export function writeRingMatchOrderProjectionMeta(meta: RingMatchOrderProjectionMeta | null) {
  const storage = getLocalStorageSafe()
  if (!storage) return
  if (!meta?.key) {
    storage.removeItem(RING_MATCH_ORDER_CURRENT_META_STORAGE_KEY)
    return
  }

  storage.setItem(RING_MATCH_ORDER_CURRENT_META_STORAGE_KEY, JSON.stringify({
    key: meta.key,
    adminBaseNormalized: normalizeProjectionAdminBase(meta.adminBaseNormalized),
    tournamentId: meta.tournamentId,
    tournamentName: (meta.tournamentName || '').toString().trim(),
    ring: (meta.ring || '').toString().trim(),
    snapshotId: meta.snapshotId == null ? null : meta.snapshotId,
    updatedAt: typeof meta.updatedAt === 'number' ? meta.updatedAt : Date.now(),
  } satisfies RingMatchOrderProjectionMeta))
}
