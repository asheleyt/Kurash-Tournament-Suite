import { writeSerializedStorageValue } from '@/composables/storageCompareBeforeWrite'

export const LOCAL_SCOREBOARD_STATE_CHANNEL = 'kurash:scoreboard-state:v1'
export const LOCAL_SCOREBOARD_STATE_STORAGE_KEY = 'kurash:scoreboard-state:snapshot'

function getLocalStorageSafe(): Storage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

export function readLocalScoreboardState(): Record<string, unknown> | null {
  const storage = getLocalStorageSafe()
  if (!storage) return null

  try {
    const raw = storage.getItem(LOCAL_SCOREBOARD_STATE_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : null
  } catch {
    return null
  }
}

export function writeLocalScoreboardState(state: Record<string, unknown> | null) {
  const storage = getLocalStorageSafe()
  if (!storage) return

  if (!state || typeof state !== 'object') {
    try {
      storage.removeItem(LOCAL_SCOREBOARD_STATE_STORAGE_KEY)
    } catch {}
    return
  }

  try {
    const serialized = JSON.stringify(state)
    writeSerializedStorageValue(storage, LOCAL_SCOREBOARD_STATE_STORAGE_KEY, serialized)
  } catch {}
}
