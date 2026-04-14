import { ref, type Ref } from 'vue'

export type PairingState = 'unpaired' | 'pairing' | 'paired_known_device' | 'pair_failed'
export type PairingResetReason =
  | 'token_invalid'
  | 'device_mismatch'
  | 'snapshot_mismatch'
  | 'forgotten_locally'
  | 'transport_error'

type AssignedTargetContentType = 'scoreboard' | 'match_order' | 'none' | 'ring_display'
type BannerType = 'success' | 'error' | 'info'

interface ControllerAssignedSetupTarget {
  content_type: AssignedTargetContentType
  enabled: boolean
}

export interface ControllerAssignedSetup {
  schema_version?: number | null
  snapshot_id?: number | string | null
  tournament_id?: number | string | null
  ring_number?: number | string | null
  targets?: Record<string, ControllerAssignedSetupTarget>
}

export interface ControllerAuthState {
  device_id: string | null
  token: string | null
  controller_id: number | null
  controller_name: string | null
  paired_at: string | null
  last_paired_host: string | null
  last_snapshot_id: number | string | null
  last_assignment: ControllerAssignedSetup | null
  last_assignment_updated_at: string | null
  last_assignment_host: string | null
  last_assignment_snapshot_id: number | string | null
  last_assignment_device_id: string | null
  last_heartbeat_at: string | null
  last_reset_reason: PairingResetReason | null
}

export interface ElectronControllerAuthBridge {
  getState: () => Promise<ControllerAuthState>
  updateState: (partial: Partial<ControllerAuthState>) => Promise<ControllerAuthState>
  clearAuth: (reason?: PairingResetReason | null) => Promise<ControllerAuthState>
}

interface UseRefereeControllerSessionOptions {
  adminBase: Ref<string>
  getNormalizedControllerAdminBase: () => string
  getSyncHasServer: () => boolean
  controllerAuthStorageKey?: string
  ensureConfigLoaded: () => Promise<void>
  localApiUrl: (path: string) => URL
  attachAdminBase: (url: URL) => void
  headers: (withJson?: boolean) => Record<string, string>
  readControllerApiResponse: (res: Response, contextLabel: string) => Promise<Record<string, any>>
  getControllerAuthBridge: () => ElectronControllerAuthBridge | null
  getClientMetadata: () => Record<string, unknown>
  normalizeApiBaseInput: (input: string) => string
  persistAdminBase: () => void
  showBanner: (message: string, type?: BannerType, timeout?: number) => void
  focusSyncSetup: () => void
  setIsOnline: (value: boolean) => void
  markLiveSnapshotRecoveryPending: () => void
  shouldAttemptLiveSnapshotRecovery: () => boolean
  attemptLiveSnapshotRecovery: (options?: { skipOnlineCheck?: boolean }) => Promise<unknown>
}

function normalizeOptionalText(value: unknown): string | null {
  if (value == null) return null
  const text = String(value).trim()
  return text ? text : null
}

function normalizeOptionalInteger(value: unknown): number | null {
  const n = Number(value)
  return Number.isFinite(n) ? Math.trunc(n) : null
}

function normalizeOptionalScalar(value: unknown): number | string | null {
  if (value == null || value === '') return null
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value)
  const text = String(value).trim()
  if (!text) return null
  const n = Number(text)
  return Number.isFinite(n) && String(Math.trunc(n)) === text ? Math.trunc(n) : text
}

function normalizeAssignedTargetContentType(value: unknown): AssignedTargetContentType | null {
  const text = normalizeOptionalText(value)
  if (text === 'scoreboard' || text === 'match_order' || text === 'none' || text === 'ring_display') return text
  return null
}

function normalizeAssignedSetup(value: unknown): ControllerAssignedSetup | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const source = value as Record<string, unknown>
  const targets: Record<string, ControllerAssignedSetupTarget> = {}

  if (source.targets && typeof source.targets === 'object' && !Array.isArray(source.targets)) {
    for (const [key, rawTarget] of Object.entries(source.targets as Record<string, unknown>)) {
      if (!rawTarget || typeof rawTarget !== 'object' || Array.isArray(rawTarget)) continue
      const targetObj = rawTarget as Record<string, unknown>
      const contentType = normalizeAssignedTargetContentType(targetObj.content_type)
      if (!contentType) continue
      targets[key] = {
        content_type: contentType,
        enabled: targetObj.enabled !== false,
      }
    }
  }

  return {
    schema_version: normalizeOptionalInteger(source.schema_version),
    snapshot_id: normalizeOptionalScalar(source.snapshot_id),
    tournament_id: normalizeOptionalScalar(source.tournament_id),
    ring_number: normalizeOptionalScalar(source.ring_number),
    targets,
  }
}

function createDefaultControllerAuthState(): ControllerAuthState {
  return {
    device_id: null,
    token: null,
    controller_id: null,
    controller_name: null,
    paired_at: null,
    last_paired_host: null,
    last_snapshot_id: null,
    last_assignment: null,
    last_assignment_updated_at: null,
    last_assignment_host: null,
    last_assignment_snapshot_id: null,
    last_assignment_device_id: null,
    last_heartbeat_at: null,
    last_reset_reason: null,
  }
}

function normalizeControllerAuthState(value: unknown): ControllerAuthState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return createDefaultControllerAuthState()
  }

  const source = value as Record<string, unknown>
  return {
    device_id: normalizeOptionalText(source.device_id),
    token: normalizeOptionalText(source.token),
    controller_id: normalizeOptionalInteger(source.controller_id),
    controller_name: normalizeOptionalText(source.controller_name),
    paired_at: normalizeOptionalText(source.paired_at),
    last_paired_host: normalizeOptionalText(source.last_paired_host),
    last_snapshot_id: normalizeOptionalScalar(source.last_snapshot_id),
    last_assignment: normalizeAssignedSetup(source.last_assignment),
    last_assignment_updated_at: normalizeOptionalText(source.last_assignment_updated_at),
    last_assignment_host: normalizeOptionalText(source.last_assignment_host),
    last_assignment_snapshot_id: normalizeOptionalScalar(source.last_assignment_snapshot_id),
    last_assignment_device_id: normalizeOptionalText(source.last_assignment_device_id),
    last_heartbeat_at: normalizeOptionalText(source.last_heartbeat_at),
    last_reset_reason: normalizeOptionalText(source.last_reset_reason) as PairingResetReason | null,
  }
}

function createBrowserFallbackDeviceId(): string {
  const randomPart = (() => {
    try {
      const runtimeCrypto = (window.crypto ?? null) as Crypto | null
      if (runtimeCrypto && typeof runtimeCrypto.randomUUID === 'function') return runtimeCrypto.randomUUID()
    } catch {}
    return `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`
  })()

  return `controller-${randomPart}`
}

export function useRefereeControllerSession(options: UseRefereeControllerSessionOptions) {
  const controllerAuthStorageKey = options.controllerAuthStorageKey ?? 'kurash_controller_auth_v1'

  const pairingCode = ref('')
  const pairingState = ref<PairingState>('unpaired')
  const pairingResetReason = ref<PairingResetReason | null>(null)
  const controllerAuthState = ref<ControllerAuthState>(createDefaultControllerAuthState())
  const assignedSetup = ref<ControllerAssignedSetup | null>(null)
  const assignedSetupUpdatedAt = ref<string | null>(null)
  const isPairingBusy = ref(false)
  const isControllerReconnectBusy = ref(false)
  const isControllerHeartbeatBusy = ref(false)
  const isAssignedSetupLoading = ref(false)
  const isAssignedSetupStale = ref(false)
  const pairingStatusDetail = ref('Enter the Admin Host and pairing code to register this controller as a known event device.')
  let knownDeviceSessionVersion = 0

  function createKnownDeviceSessionGuard() {
    const expectedVersion = knownDeviceSessionVersion
    const expectedToken = normalizeOptionalText(controllerAuthState.value.token)
    const expectedDeviceId = normalizeOptionalText(controllerAuthState.value.device_id)

    return () =>
      expectedVersion === knownDeviceSessionVersion
      && expectedToken === normalizeOptionalText(controllerAuthState.value.token)
      && expectedDeviceId === normalizeOptionalText(controllerAuthState.value.device_id)
  }

  function buildControllerAuthHeaders(withJson = false) {
    const baseHeaders = options.headers(withJson)
    const token = normalizeOptionalText(controllerAuthState.value.token)
    const deviceId = normalizeOptionalText(controllerAuthState.value.device_id)
    if (token) baseHeaders.Authorization = `Bearer ${token}`
    if (deviceId) baseHeaders['X-Controller-Device-Id'] = deviceId
    return baseHeaders
  }

  async function loadStoredControllerAuthState(): Promise<ControllerAuthState> {
    const bridge = options.getControllerAuthBridge()
    if (bridge) {
      const nextState = normalizeControllerAuthState(await bridge.getState())
      if (!nextState.device_id) {
        return normalizeControllerAuthState(await bridge.updateState({ device_id: createBrowserFallbackDeviceId() }))
      }
      return nextState
    }

    try {
      const raw = localStorage.getItem(controllerAuthStorageKey)
      const nextState = normalizeControllerAuthState(raw ? JSON.parse(raw) : null)
      if (nextState.device_id) return nextState
      const withId = normalizeControllerAuthState({
        ...nextState,
        device_id: createBrowserFallbackDeviceId(),
      })
      localStorage.setItem(controllerAuthStorageKey, JSON.stringify(withId))
      return withId
    } catch {
      const fallback = normalizeControllerAuthState({ device_id: createBrowserFallbackDeviceId() })
      try { localStorage.setItem(controllerAuthStorageKey, JSON.stringify(fallback)) } catch {}
      return fallback
    }
  }

  async function persistStoredControllerAuthState(partial: Partial<ControllerAuthState>): Promise<ControllerAuthState> {
    const bridge = options.getControllerAuthBridge()
    if (bridge) {
      return normalizeControllerAuthState(await bridge.updateState(partial))
    }

    const current = await loadStoredControllerAuthState()
    const nextState = normalizeControllerAuthState({
      ...current,
      ...partial,
    })
    try { localStorage.setItem(controllerAuthStorageKey, JSON.stringify(nextState)) } catch {}
    return nextState
  }

  async function clearStoredControllerAuthState(reason: PairingResetReason | null): Promise<ControllerAuthState> {
    const bridge = options.getControllerAuthBridge()
    if (bridge) {
      return normalizeControllerAuthState(await bridge.clearAuth(reason))
    }

    const current = await loadStoredControllerAuthState()
    const nextState = normalizeControllerAuthState({
      ...current,
      token: null,
      last_snapshot_id: null,
      last_assignment: null,
      last_assignment_updated_at: null,
      last_assignment_host: null,
      last_assignment_snapshot_id: null,
      last_assignment_device_id: null,
      last_heartbeat_at: null,
      last_reset_reason: reason,
    })
    try { localStorage.setItem(controllerAuthStorageKey, JSON.stringify(nextState)) } catch {}
    return nextState
  }

  function isCachedAssignmentValidForContext(
    state: ControllerAuthState,
    host: string,
    snapshotId: number | string | null = state.last_snapshot_id,
  ) {
    if (!state.last_assignment) return false
    if (!host) return false
    if (!state.device_id) return false
    const cachedHost = normalizeOptionalText(state.last_assignment_host)
    const cachedDeviceId = normalizeOptionalText(state.last_assignment_device_id)
    const cachedSnapshotId = normalizeOptionalScalar(state.last_assignment_snapshot_id)
    const currentSnapshotId = normalizeOptionalScalar(snapshotId)

    return cachedHost === host
      && cachedDeviceId === state.device_id
      && currentSnapshotId != null
      && cachedSnapshotId != null
      && String(cachedSnapshotId) === String(currentSnapshotId)
  }

  function pairingResetReasonMessage(reason: PairingResetReason | null): string {
    switch (reason) {
      case 'token_invalid':
        return 'Saved pairing expired or is no longer valid. Pair this controller again to continue.'
      case 'device_mismatch':
        return 'Saved pairing no longer matches this controller identity. Pair again with a fresh code.'
      case 'snapshot_mismatch':
        return 'This saved pairing belongs to a previous event snapshot. Pair again for the current event.'
      case 'forgotten_locally':
        return 'Local pairing was cleared on this machine. Pair again when you are ready.'
      case 'transport_error':
        return 'The controller could not reach the Admin Host for pairing. Check the local LAN connection and host address.'
      default:
        return 'Enter the Admin Host and pairing code to register this controller as a known event device.'
    }
  }

  function updatePairingStatusDetail(detail?: string | null) {
    const nextDetail = normalizeOptionalText(detail)
    if (nextDetail) {
      pairingStatusDetail.value = nextDetail
      return
    }

    if (!controllerAuthState.value.token) {
      pairingStatusDetail.value = pairingResetReasonMessage(pairingResetReason.value)
      return
    }

    if (assignedSetup.value && !isAssignedSetupStale.value) {
      pairingStatusDetail.value = 'Known device connected. Admin-assigned tournament and gilam are authoritative for queue selection.'
      return
    }

    if (assignedSetup.value && isAssignedSetupStale.value) {
      pairingStatusDetail.value = 'Known device connected, but assigned setup could not be refreshed. The last matching assignment is shown as stale.'
      return
    }

    pairingStatusDetail.value = 'Known device connected. Waiting for Admin to provide assigned tournament and gilam details.'
  }

  function applyControllerAuthState(nextState: ControllerAuthState) {
    controllerAuthState.value = normalizeControllerAuthState(nextState)
    pairingResetReason.value = controllerAuthState.value.last_reset_reason

    if (isCachedAssignmentValidForContext(controllerAuthState.value, options.getNormalizedControllerAdminBase())) {
      assignedSetup.value = normalizeAssignedSetup(controllerAuthState.value.last_assignment)
      assignedSetupUpdatedAt.value = controllerAuthState.value.last_assignment_updated_at
    } else {
      assignedSetup.value = null
      assignedSetupUpdatedAt.value = null
    }
    isAssignedSetupStale.value = false

    if (controllerAuthState.value.token) {
      pairingState.value = 'paired_known_device'
      if (!pairingStatusDetail.value || pairingStatusDetail.value.includes('Enter the Admin Host and pairing code')) {
        pairingStatusDetail.value = 'Known device credentials are saved locally. The controller will reconnect automatically when the Admin Host is reachable.'
      }
      return
    }

    pairingState.value = pairingState.value === 'pair_failed' ? 'pair_failed' : 'unpaired'
    updatePairingStatusDetail(null)
  }

  async function persistControllerAuthState(partial: Partial<ControllerAuthState>) {
    const nextState = await persistStoredControllerAuthState(partial)
    applyControllerAuthState(nextState)
    return nextState
  }

  async function clearControllerAuthState(reason: PairingResetReason | null, detailMessage?: string) {
    knownDeviceSessionVersion += 1
    const nextState = await clearStoredControllerAuthState(reason)
    applyControllerAuthState(nextState)
    pairingState.value = 'unpaired'
    pairingResetReason.value = reason
    assignedSetup.value = null
    assignedSetupUpdatedAt.value = null
    isAssignedSetupStale.value = false
    if (detailMessage) pairingStatusDetail.value = detailMessage
    return nextState
  }

  async function pairControllerRemote() {
    await options.ensureConfigLoaded()
    const url = options.localApiUrl('/controller/pair')
    options.attachAdminBase(url)

    const deviceId = normalizeOptionalText(controllerAuthState.value.device_id) || createBrowserFallbackDeviceId()
    if (!controllerAuthState.value.device_id) {
      await persistControllerAuthState({ device_id: deviceId })
    }

    const shortDeviceId = deviceId.replace(/^controller-/, '').slice(0, 8) || 'device'
    const payload = {
      code: (pairingCode.value || '').toString().trim(),
      device_id: deviceId,
      name: controllerAuthState.value.controller_name || `Gilam Controller ${shortDeviceId}`,
      client: options.getClientMetadata(),
    }

    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: options.headers(true),
      body: JSON.stringify(payload),
    })

    return options.readControllerApiResponse(res, 'Pairing')
  }

  async function heartbeatControllerRemote() {
    await options.ensureConfigLoaded()
    const url = options.localApiUrl('/controller/heartbeat')
    options.attachAdminBase(url)
    const deviceId = normalizeOptionalText(controllerAuthState.value.device_id)
    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: buildControllerAuthHeaders(true),
      body: JSON.stringify({
        device_id: deviceId,
        client: options.getClientMetadata(),
      }),
    })

    return options.readControllerApiResponse(res, 'Known-device reconnect')
  }

  async function fetchAssignedSetupRemote() {
    await options.ensureConfigLoaded()
    const url = options.localApiUrl('/controller/assigned-setup')
    options.attachAdminBase(url)
    const deviceId = normalizeOptionalText(controllerAuthState.value.device_id)
    if (deviceId) url.searchParams.set('device_id', deviceId)
    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: buildControllerAuthHeaders(),
    })

    return options.readControllerApiResponse(res, 'Assigned setup')
  }

  async function applyPairSuccessPayload(payload: Record<string, any>) {
    const data = payload?.data && typeof payload.data === 'object' ? payload.data : {}
    const controller = data?.controller && typeof data.controller === 'object' ? data.controller : {}
    const snapshot = data?.snapshot && typeof data.snapshot === 'object' ? data.snapshot : {}
    const nextState = await persistControllerAuthState({
      device_id: normalizeOptionalText(controller.device_id) || controllerAuthState.value.device_id,
      token: normalizeOptionalText(data?.token),
      controller_id: normalizeOptionalInteger(controller.id),
      controller_name: normalizeOptionalText(controller.name) || controllerAuthState.value.controller_name,
      paired_at: normalizeOptionalText(controller.paired_at),
      last_paired_host: options.getNormalizedControllerAdminBase() || controllerAuthState.value.last_paired_host,
      last_snapshot_id: normalizeOptionalScalar(snapshot.id),
      last_assignment: null,
      last_assignment_updated_at: null,
      last_assignment_host: null,
      last_assignment_snapshot_id: null,
      last_assignment_device_id: null,
      last_heartbeat_at: null,
      last_reset_reason: null,
    })
    pairingResetReason.value = null
    pairingState.value = 'paired_known_device'
    isAssignedSetupStale.value = false
    pairingCode.value = ''
    updatePairingStatusDetail('Pairing succeeded. Reconnecting as a known device and requesting Admin-assigned setup.')
    return nextState
  }

  async function applyHeartbeatPayload(payload: Record<string, any>) {
    const data = payload?.data && typeof payload.data === 'object' ? payload.data : {}
    const controller = data?.controller && typeof data.controller === 'object' ? data.controller : {}
    const lastSnapshotId = normalizeOptionalScalar(
      controllerAuthState.value.last_snapshot_id
        ?? controllerAuthState.value.last_assignment_snapshot_id
        ?? null,
    )

    await persistControllerAuthState({
      device_id: normalizeOptionalText(controller.device_id) || controllerAuthState.value.device_id,
      controller_id: normalizeOptionalInteger(controller.id) ?? controllerAuthState.value.controller_id,
      controller_name: normalizeOptionalText(controller.name) || controllerAuthState.value.controller_name,
      paired_at: normalizeOptionalText(controller.paired_at) || controllerAuthState.value.paired_at,
      last_paired_host: options.getNormalizedControllerAdminBase() || controllerAuthState.value.last_paired_host,
      last_snapshot_id: lastSnapshotId,
      last_heartbeat_at: normalizeOptionalText(controller.last_seen_at) || normalizeOptionalText(data.server_time),
      last_reset_reason: null,
    })

    pairingResetReason.value = null
    pairingState.value = 'paired_known_device'
  }

  async function applyAssignedSetupPayload(payload: Record<string, any>) {
    const data = payload?.data && typeof payload.data === 'object' ? payload.data : {}
    const nextAssignedSetup = normalizeAssignedSetup(data?.assigned_setup)
    const nextAssignedSetupUpdatedAt = normalizeOptionalText(data?.assigned_setup_updated_at)
    const snapshotId = normalizeOptionalScalar(
      nextAssignedSetup?.snapshot_id
        ?? controllerAuthState.value.last_snapshot_id
        ?? data?.snapshot_id
        ?? null,
    )

    assignedSetup.value = nextAssignedSetup
    assignedSetupUpdatedAt.value = nextAssignedSetupUpdatedAt
    isAssignedSetupStale.value = false

    await persistControllerAuthState({
      last_snapshot_id: snapshotId ?? controllerAuthState.value.last_snapshot_id,
      last_assignment: nextAssignedSetup,
      last_assignment_updated_at: nextAssignedSetupUpdatedAt,
      last_assignment_host: options.getNormalizedControllerAdminBase() || controllerAuthState.value.last_paired_host,
      last_assignment_snapshot_id: snapshotId ?? null,
      last_assignment_device_id: controllerAuthState.value.device_id,
      last_reset_reason: null,
    })

    if (nextAssignedSetup) {
      options.markLiveSnapshotRecoveryPending()
    }
    updatePairingStatusDetail(null)
  }

  async function refreshAssignedSetupState(
    showErrorBanner = false,
    sessionGuard?: () => boolean,
  ) {
    isAssignedSetupLoading.value = true
    try {
      const payload = await fetchAssignedSetupRemote()
      if (sessionGuard && !sessionGuard()) {
        return null
      }
      await applyAssignedSetupPayload(payload)
      return payload
    } catch (error: any) {
      const canReuseCachedAssignment = isCachedAssignmentValidForContext(
        controllerAuthState.value,
        options.getNormalizedControllerAdminBase(),
      )

      if (canReuseCachedAssignment && controllerAuthState.value.last_assignment) {
        assignedSetup.value = normalizeAssignedSetup(controllerAuthState.value.last_assignment)
        assignedSetupUpdatedAt.value = controllerAuthState.value.last_assignment_updated_at
        isAssignedSetupStale.value = !!assignedSetup.value
        updatePairingStatusDetail(null)
        if (showErrorBanner) options.showBanner(error?.message || 'Assigned setup refresh failed.', 'error', 5000)
        return null
      }

      assignedSetup.value = null
      assignedSetupUpdatedAt.value = null
      isAssignedSetupStale.value = false
      if (showErrorBanner) options.showBanner(error?.message || 'Assigned setup refresh failed.', 'error', 5000)
      throw error
    } finally {
      isAssignedSetupLoading.value = false
    }
  }

  async function handleKnownDeviceSessionFailure(
    error: any,
    genericDetail: string,
  ) {
    const code = normalizeOptionalText(error?.code)
    if (code === 'controller_token_invalid') {
      await clearControllerAuthState('token_invalid', pairingResetReasonMessage('token_invalid'))
      options.setIsOnline(false)
      options.showBanner(pairingResetReasonMessage('token_invalid'), 'error', 5000)
      return false
    }
    if (code === 'controller_device_id_mismatch' || code === 'controller_device_id_required') {
      await clearControllerAuthState('device_mismatch', pairingResetReasonMessage('device_mismatch'))
      options.setIsOnline(false)
      options.showBanner(pairingResetReasonMessage('device_mismatch'), 'error', 5000)
      return false
    }
    if (code === 'controller_snapshot_mismatch') {
      await clearControllerAuthState('snapshot_mismatch', pairingResetReasonMessage('snapshot_mismatch'))
      options.setIsOnline(false)
      options.showBanner(pairingResetReasonMessage('snapshot_mismatch'), 'error', 5000)
      return false
    }

    pairingState.value = 'paired_known_device'
    options.setIsOnline(false)
    updatePairingStatusDetail(error?.message || genericDetail)
    return false
  }

  async function heartbeatKnownDeviceSession(optionsForHeartbeat: {
    refreshAssignment?: boolean
    allowLiveRecovery?: boolean
    showSuccessBanner?: boolean
  } = {}) {
    if (!controllerAuthState.value.token || !controllerAuthState.value.device_id || !options.getSyncHasServer()) return false
    if (isControllerHeartbeatBusy.value) return true

    const refreshAssignment = optionsForHeartbeat.refreshAssignment === true
    const allowLiveRecovery = optionsForHeartbeat.allowLiveRecovery === true
    const sessionGuard = createKnownDeviceSessionGuard()

    isControllerHeartbeatBusy.value = true
    try {
      const heartbeatPayload = await heartbeatControllerRemote()
      if (!sessionGuard()) return false
      await applyHeartbeatPayload(heartbeatPayload)
      options.setIsOnline(true)

      if (refreshAssignment) {
        await refreshAssignedSetupState(false, sessionGuard)
      }

      if (allowLiveRecovery && sessionGuard() && options.shouldAttemptLiveSnapshotRecovery()) {
        void options.attemptLiveSnapshotRecovery({ skipOnlineCheck: true })
      }

      updatePairingStatusDetail(null)
      if (optionsForHeartbeat.showSuccessBanner) {
        options.showBanner('Known device reconnected to the Admin Host.', 'success', 2500)
      }
      return true
    } catch (error: any) {
      return handleKnownDeviceSessionFailure(
        error,
        refreshAssignment
          ? 'Known device reconnect failed. Manual fallback remains available while the local LAN connection is restored.'
          : 'Known device heartbeat failed. Background retries will continue.',
      )
    } finally {
      isControllerHeartbeatBusy.value = false
    }
  }

  async function reconnectKnownDeviceSession(showSuccessBanner = false) {
    if (!controllerAuthState.value.token || !controllerAuthState.value.device_id || !options.getSyncHasServer()) return false

    isControllerReconnectBusy.value = true
    try {
      return await heartbeatKnownDeviceSession({
        refreshAssignment: true,
        allowLiveRecovery: true,
        showSuccessBanner,
      })
    } catch (error: any) {
      return handleKnownDeviceSessionFailure(
        error,
        'Known device reconnect failed. Manual fallback remains available while the local LAN connection is restored.',
      )
    } finally {
      isControllerReconnectBusy.value = false
    }
  }

  async function submitControllerPairing() {
    try {
      if (!options.adminBase.value) {
        const error = new Error('Enter the Admin Host address first.') as Error & { code?: string }
        error.code = 'admin_base_required'
        throw error
      }
      if (!pairingCode.value.trim()) {
        const error = new Error('Enter the short-lived pairing code from Admin.') as Error & { code?: string }
        error.code = 'validation_error'
        throw error
      }

      options.adminBase.value = options.normalizeApiBaseInput(options.adminBase.value)
      options.persistAdminBase()
    } catch (error: any) {
      const message = error?.message || 'Invalid Admin Host address.'
      pairingState.value = 'pair_failed'
      pairingResetReason.value = error?.code === 'transport_error' ? 'transport_error' : pairingResetReason.value
      updatePairingStatusDetail(message)
      options.showBanner(message, 'error', 5000)
      options.focusSyncSetup()
      return
    }

    isPairingBusy.value = true
    pairingState.value = 'pairing'
    updatePairingStatusDetail('Sending the pairing code to the Admin Host and registering this controller.')

    try {
      const payload = await pairControllerRemote()
      await applyPairSuccessPayload(payload)
      const reconnected = await reconnectKnownDeviceSession(false)
      if (!reconnected) {
        if (controllerAuthState.value.token) {
          options.showBanner(
            pairingStatusDetail.value || 'Pairing succeeded, but known-device reconnect failed.',
            'error',
            5000,
          )
        }
        return
      }
      updatePairingStatusDetail(null)
      if (assignedSetup.value) {
        options.showBanner('Controller paired and Admin-assigned setup is active.', 'success', 3000)
      } else {
        options.showBanner('Controller paired successfully. Waiting for Admin-assigned setup.', 'success', 3000)
      }
    } catch (error: any) {
      const code = normalizeOptionalText(error?.code)
      pairingState.value = 'pair_failed'
      if (code === 'transport_error') pairingResetReason.value = 'transport_error'
      updatePairingStatusDetail(error?.message || 'Pairing failed.')
      options.showBanner(error?.message || 'Pairing failed.', 'error', 5000)
    } finally {
      isPairingBusy.value = false
    }
  }

  async function forgetControllerPairing() {
    await clearControllerAuthState('forgotten_locally', pairingResetReasonMessage('forgotten_locally'))
    options.showBanner('Local pairing has been cleared from this controller.', 'info', 3200)
  }

  return {
    pairingCode,
    pairingState,
    pairingResetReason,
    controllerAuthState,
    assignedSetup,
    assignedSetupUpdatedAt,
    isPairingBusy,
    isControllerReconnectBusy,
    isControllerHeartbeatBusy,
    isAssignedSetupLoading,
    isAssignedSetupStale,
    pairingStatusDetail,
    loadStoredControllerAuthState,
    applyControllerAuthState,
    persistControllerAuthState,
    clearControllerAuthState,
    submitControllerPairing,
    forgetControllerPairing,
    heartbeatKnownDeviceSession,
    reconnectKnownDeviceSession,
    refreshAssignedSetupState,
    pairingResetReasonMessage,
    updatePairingStatusDetail,
  }
}
