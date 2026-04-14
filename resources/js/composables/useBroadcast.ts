export function useBroadcast() {
  const getCsrfToken = () =>
    (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement | null)?.content ?? ''

  const broadcast = async (endpoint: string, payload: Record<string, any>) => {
    try {
      const csrfToken = getCsrfToken()

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': csrfToken,
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
        credentials: 'same-origin',
      })

      if (!response.ok) {
        throw new Error(`Broadcast failed: ${response.statusText}`)
      }

      return response
    } catch (e) {
      console.error(`Failed to broadcast to ${endpoint}`, e)
      throw e
    }
  }

  const broadcastBatch = (payload: Record<string, any>) => broadcast('/broadcast/batch', payload)

  let pendingBatch: Record<string, any> | null = null
  let batchTimer: number | null = null

  const flushBatch = async () => {
    if (!pendingBatch) return

    const payload = pendingBatch
    pendingBatch = null

    if (batchTimer !== null) {
      clearTimeout(batchTimer)
      batchTimer = null
    }

    return broadcastBatch(payload)
  }

  const queueBatch = (partial: Record<string, any>, delayMs = 15) => {
    pendingBatch = { ...(pendingBatch ?? {}), ...(partial ?? {}) }

    if (batchTimer !== null) return
    batchTimer = window.setTimeout(() => {
      void flushBatch().catch((e) => console.error('Failed to flush broadcast batch', e))
    }, delayMs) as unknown as number
  }

  return {
    broadcast,
    broadcastBatch,
    queueBatch,
    flushBatch,
  }
}