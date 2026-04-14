const serializedStorageCache = new Map<string, string | null>()

export interface SerializedStorageWriteResult {
  written: boolean
}

export function writeSerializedStorageValue(
  storage: Storage | null,
  storageKey: string,
  serializedValue: string,
): SerializedStorageWriteResult {
  if (!storage || !storageKey) return { written: false }

  try {
    if (serializedStorageCache.has(storageKey) && serializedStorageCache.get(storageKey) === serializedValue) {
      return { written: false }
    }

    if (!serializedStorageCache.has(storageKey)) {
      const existingValue = storage.getItem(storageKey)
      serializedStorageCache.set(storageKey, existingValue)
      if (existingValue === serializedValue) {
        serializedStorageCache.set(storageKey, serializedValue)
        return { written: false }
      }
    }

    storage.setItem(storageKey, serializedValue)
    serializedStorageCache.set(storageKey, serializedValue)
    return { written: true }
  } catch {
    return { written: false }
  }
}
