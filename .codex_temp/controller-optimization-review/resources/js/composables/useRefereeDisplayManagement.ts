import { computed, ref } from 'vue'
import type { ElectronDisplayRole } from '@/composables/useRingMatchOrderProjection'
import type {
  ElectronBroadcastProfile,
  ElectronDisplayInfo,
  ElectronDisplayManagementBridge,
  ElectronDisplaySessionSummary,
  ElectronDisplayState,
  ElectronPerDisplayStatus,
} from '@/composables/refereeDisplayTypes'

type BannerType = 'success' | 'error' | 'info'

interface UseRefereeDisplayManagementOptions {
  getDisplayBridge: () => ElectronDisplayManagementBridge | null
  showBanner: (message: string, type?: BannerType, timeout?: number) => void
  prepareScoreboardOutputChange: () => Promise<boolean>
  handleSuccessfulLaunch: (nextState: ElectronDisplayState | null) => void
  getRingMatchOrderProjectionKey: () => string
  getSyncConfigurationReady: () => boolean
}

function createDefaultDisplayState(): ElectronDisplayState {
  return {
    displays: [],
    displayRoles: ['scoreboard', 'ring_match_order'],
    controllerDisplayId: null,
    scoreboardDisplayId: null,
    preferredScoreboardDisplayId: null,
    preferredPrimaryScoreboardDisplayId: null,
    selectedScoreboardDisplayIds: [],
    selectedRingMatchOrderDisplayIds: [],
    selectedDisplayIdsByRole: {
      scoreboard: [],
      ring_match_order: [],
    },
    liveScoreboardDisplayIds: [],
    liveRingMatchOrderDisplayIds: [],
    liveDisplayIdsByRole: {
      scoreboard: [],
      ring_match_order: [],
    },
    previewDisplayId: null,
    previewDisplayIds: [],
    previewRingMatchOrderDisplayIds: [],
    previewDisplayIdsByRole: {
      scoreboard: [],
      ring_match_order: [],
    },
    missingSelectedDisplayIds: [],
    missingRingMatchOrderDisplayIds: [],
    missingDisplayIdsByRole: {
      scoreboard: [],
      ring_match_order: [],
    },
    pendingSelectedDisplayIds: [],
    pendingRingMatchOrderDisplayIds: [],
    pendingDisplayIdsByRole: {
      scoreboard: [],
      ring_match_order: [],
    },
    knownDisplayLabels: {},
    scoreboardFullscreenPreference: true,
    scoreboardMode: 'hidden',
    scoreboardStatus: 'not-launched',
    ringMatchOrderMode: 'hidden',
    ringMatchOrderStatus: 'not-launched',
    isFallbackToPrimary: false,
    scoreboardOutputMode: 'single',
    broadcastSessionState: 'not_started',
    ringMatchOrderSessionState: 'not_started',
    displayStatuses: {},
    displayStatusesByRole: {
      scoreboard: {},
      ring_match_order: {},
    },
    broadcastProfiles: [],
    sessionSummary: {
      selectedCount: 0,
      liveCount: 0,
      previewCount: 0,
      missingCount: 0,
      failedCount: 0,
      disconnectedCount: 0,
      pendingSelectedCount: 0,
    },
    roleSessionStates: {
      scoreboard: 'not_started',
      ring_match_order: 'not_started',
    },
    roleSessionSummaries: {
      scoreboard: {
        selectedCount: 0,
        liveCount: 0,
        previewCount: 0,
        missingCount: 0,
        failedCount: 0,
        disconnectedCount: 0,
        pendingSelectedCount: 0,
      },
      ring_match_order: {
        selectedCount: 0,
        liveCount: 0,
        previewCount: 0,
        missingCount: 0,
        failedCount: 0,
        disconnectedCount: 0,
        pendingSelectedCount: 0,
      },
    },
    statusNotice: null,
    diagnosticsEnabled: false,
    updatedAt: Date.now(),
  }
}

export function useRefereeDisplayManagement(options: UseRefereeDisplayManagementOptions) {
  const displayState = ref<ElectronDisplayState>(createDefaultDisplayState())
  const displayActionPending = ref(false)
  const isDisplayAdvancedOpen = ref(false)
  const isDisplayScreenMenuOpen = ref(false)
  const newBroadcastProfileName = ref('')
  const selectedBroadcastProfileId = ref('')
  const controllerOutputConfirmed = ref(false)
  const displayErrorMessage = ref('')
  const selectedScoreboardDisplayId = ref<string | null>(null)
  const lastDisplayNoticeTimestamp = ref<number | null>(null)

  const isDisplayManagementAvailable = computed(() => !!options.getDisplayBridge())
  const detectedDisplays = computed(() => displayState.value.displays)
  const controllerDisplayInfo = computed(() =>
    detectedDisplays.value.find((display) => display.id === displayState.value.controllerDisplayId) ?? null
  )
  const scoreboardDisplayInfo = computed(() =>
    detectedDisplays.value.find((display) => display.id === displayState.value.scoreboardDisplayId) ?? null
  )
  const preferredScoreboardDisplayInfo = computed(() =>
    detectedDisplays.value.find((display) => display.id === displayState.value.preferredScoreboardDisplayId) ?? null
  )
  const selectedScoreboardDisplayIds = computed(() => displayState.value.selectedScoreboardDisplayIds ?? [])
  const liveScoreboardDisplayIds = computed(() => displayState.value.liveScoreboardDisplayIds ?? [])
  const previewDisplayIds = computed(() => displayState.value.previewDisplayIds ?? [])
  const missingSelectedDisplayIds = computed(() => displayState.value.missingSelectedDisplayIds ?? [])
  const selectedRingMatchOrderDisplayIds = computed(() =>
    displayState.value.selectedRingMatchOrderDisplayIds
    ?? displayState.value.selectedDisplayIdsByRole?.ring_match_order
    ?? []
  )
  const liveRingMatchOrderDisplayIds = computed(() =>
    displayState.value.liveRingMatchOrderDisplayIds
    ?? displayState.value.liveDisplayIdsByRole?.ring_match_order
    ?? []
  )
  const previewRingMatchOrderDisplayIds = computed(() =>
    displayState.value.previewRingMatchOrderDisplayIds
    ?? displayState.value.previewDisplayIdsByRole?.ring_match_order
    ?? []
  )
  const missingRingMatchOrderDisplayIds = computed(() =>
    displayState.value.missingRingMatchOrderDisplayIds
    ?? displayState.value.missingDisplayIdsByRole?.ring_match_order
    ?? []
  )
  const knownDisplayLabels = computed(() => displayState.value.knownDisplayLabels ?? {})
  const selectedScoreboardDisplays = computed(() =>
    selectedScoreboardDisplayIds.value
      .map((displayId) => detectedDisplays.value.find((display) => display.id === displayId) ?? null)
      .filter((display): display is ElectronDisplayInfo => !!display)
  )
  const liveScoreboardDisplays = computed(() =>
    liveScoreboardDisplayIds.value
      .map((displayId) => detectedDisplays.value.find((display) => display.id === displayId) ?? null)
      .filter((display): display is ElectronDisplayInfo => !!display)
  )
  const selectedRingMatchOrderDisplays = computed(() =>
    selectedRingMatchOrderDisplayIds.value
      .map((displayId) => detectedDisplays.value.find((display) => display.id === displayId) ?? null)
      .filter((display): display is ElectronDisplayInfo => !!display)
  )
  const liveRingMatchOrderDisplays = computed(() =>
    liveRingMatchOrderDisplayIds.value
      .map((displayId) => detectedDisplays.value.find((display) => display.id === displayId) ?? null)
      .filter((display): display is ElectronDisplayInfo => !!display)
  )
  const broadcastProfiles = computed(() => displayState.value.broadcastProfiles ?? [])
  const selectedBroadcastProfile = computed(() =>
    broadcastProfiles.value.find((profile) => String(profile.id) === selectedBroadcastProfileId.value) ?? null
  )
  const externalDisplays = computed(() => detectedDisplays.value.filter((display) => !display.isPrimary))
  const isBroadcastMode = computed(() => displayState.value.scoreboardOutputMode === 'broadcast')
  const isDisplayTestActive = computed(() => displayState.value.broadcastSessionState === 'testing')
  const isScoreboardLive = computed(() =>
    displayState.value.scoreboardStatus === 'live' || displayState.value.scoreboardStatus === 'disconnected'
  )
  const isRingMatchOrderPreviewActive = computed(() =>
    (displayState.value.ringMatchOrderSessionState ?? displayState.value.roleSessionStates?.ring_match_order) === 'testing'
  )
  const isRingMatchOrderLive = computed(() =>
    displayState.value.ringMatchOrderStatus === 'live' || displayState.value.ringMatchOrderStatus === 'disconnected'
  )
  const requiresScoreboardDisplaySelection = computed(() =>
    selectedScoreboardDisplayIds.value.length === 0
  )
  const requiresRingMatchOrderDisplaySelection = computed(() =>
    selectedRingMatchOrderDisplayIds.value.length === 0
  )
  const controllerDisplaySelected = computed(() =>
    !!displayState.value.controllerDisplayId && selectedScoreboardDisplayIds.value.includes(displayState.value.controllerDisplayId)
  )
  const requiresControllerOutputConfirmation = computed(() =>
    controllerDisplaySelected.value && !controllerOutputConfirmed.value
  )
  const selectedOutputPerformanceWarning = computed(() =>
    isBroadcastMode.value && selectedScoreboardDisplayIds.value.length > 4
  )
  const missingSelectedDisplayEntries = computed(() =>
    missingSelectedDisplayIds.value.map((displayId) => ({
      id: displayId,
      label: getKnownDisplayLabel(displayId),
    }))
  )
  const missingRingMatchOrderDisplayEntries = computed(() =>
    missingRingMatchOrderDisplayIds.value.map((displayId) => ({
      id: displayId,
      label: getKnownDisplayLabel(displayId),
    }))
  )
  const displayModeLabel = computed(() => {
    return isBroadcastMode.value ? 'Multiple Screens' : 'Single Screen'
  })
  const scoreboardStatusLabel = computed(() => {
    const session = displayState.value.broadcastSessionState
    const { liveCount, pendingSelectedCount = 0 } = displayState.value.sessionSummary
    if (session === 'testing') return 'Testing'
    if (session === 'partially_degraded') {
      if (pendingSelectedCount > 0) return 'Rejoin Available'
      return 'Broadcast Degraded'
    }
    if (session === 'live') return liveCount > 1 ? `Live on ${liveCount} screens` : 'Live'
    if (session === 'ready') return 'Ready to Launch'
    if (session === 'stopped') return 'Stopped'
    return 'Not Started'
  })
  const scoreboardStatusToneClass = computed(() => {
    if (displayState.value.broadcastSessionState === 'testing') {
      return 'border-sky-500/40 bg-sky-500/10 text-sky-100'
    }
    if (displayState.value.broadcastSessionState === 'partially_degraded') {
      return 'border-amber-500/40 bg-amber-500/10 text-amber-100'
    }
    if (displayState.value.broadcastSessionState === 'live') {
      return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
    }
    if (displayState.value.broadcastSessionState === 'ready') {
      return 'border-blue-500/40 bg-blue-500/10 text-blue-100'
    }
    return 'border-white/10 bg-black/20 text-gray-300'
  })
  const scoreboardStatusDescription = computed(() => {
    const summary = displayState.value.sessionSummary
    const unavailableCount = summary.disconnectedCount + summary.failedCount + summary.missingCount

    if (displayState.value.broadcastSessionState === 'testing') {
      return isBroadcastMode.value
        ? 'Display test is running on the selected screens.'
        : 'Display test is running on the selected screen.'
    }
    if (displayState.value.broadcastSessionState === 'partially_degraded') {
      if ((summary.pendingSelectedCount ?? 0) > 0 && summary.liveCount > 0) {
        return `${summary.pendingSelectedCount} screen${summary.pendingSelectedCount === 1 ? '' : 's'} ready to re-add.`
      }
      if (summary.disconnectedCount > 0) {
        return `${summary.disconnectedCount} screen${summary.disconnectedCount === 1 ? '' : 's'} disconnected.`
      }
      if (unavailableCount > 0) {
        return `${unavailableCount} screen${unavailableCount === 1 ? '' : 's'} unavailable.`
      }
      return 'Some selected outputs need attention.'
    }
    if (displayState.value.broadcastSessionState === 'live') {
      return liveScoreboardDisplays.value.length > 1
        ? 'All selected outputs are live.'
        : `Live on ${scoreboardDisplayInfo.value?.label || 'the selected screen'}.`
    }
    if (displayState.value.broadcastSessionState === 'ready') {
      return isBroadcastMode.value
        ? 'Broadcast will start on the selected screens.'
        : 'Broadcast will start on the selected screen.'
    }
    if (displayState.value.broadcastSessionState === 'stopped') {
      return 'Broadcast stopped. Selection stays saved.'
    }
    return isBroadcastMode.value
      ? 'Choose screens to prepare the next launch.'
      : 'Choose a screen to prepare the next launch.'
  })
  const ringMatchOrderSummary = computed<ElectronDisplaySessionSummary>(() =>
    displayState.value.roleSessionSummaries?.ring_match_order ?? {
      selectedCount: selectedRingMatchOrderDisplayIds.value.length,
      liveCount: liveRingMatchOrderDisplayIds.value.length,
      previewCount: previewRingMatchOrderDisplayIds.value.length,
      missingCount: missingRingMatchOrderDisplayIds.value.length,
      failedCount: 0,
      disconnectedCount: 0,
      pendingSelectedCount: 0,
    }
  )
  const ringMatchOrderStatusLabel = computed(() => {
    const session = displayState.value.ringMatchOrderSessionState ?? displayState.value.roleSessionStates?.ring_match_order
    const summary = ringMatchOrderSummary.value
    if (session === 'testing') return 'Previewing'
    if (session === 'partially_degraded') {
      if ((summary.pendingSelectedCount ?? 0) > 0) return 'Rejoin Available'
      return 'Projection Degraded'
    }
    if (session === 'live') return summary.liveCount > 1 ? `Live on ${summary.liveCount} screens` : 'Live'
    if (session === 'ready') return 'Ready to Launch'
    if (session === 'stopped') return 'Stopped'
    return 'Not Started'
  })
  const ringMatchOrderStatusToneClass = computed(() => {
    const session = displayState.value.ringMatchOrderSessionState ?? displayState.value.roleSessionStates?.ring_match_order
    if (session === 'testing') return 'border-sky-500/40 bg-sky-500/10 text-sky-100'
    if (session === 'partially_degraded') return 'border-amber-500/40 bg-amber-500/10 text-amber-100'
    if (session === 'live') return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
    if (session === 'ready') return 'border-cyan-500/40 bg-cyan-500/10 text-cyan-100'
    return 'border-white/10 bg-black/20 text-gray-300'
  })
  const ringMatchOrderStatusDescription = computed(() => {
    const summary = ringMatchOrderSummary.value
    const unavailableCount = summary.disconnectedCount + summary.failedCount + summary.missingCount
    const session = displayState.value.ringMatchOrderSessionState ?? displayState.value.roleSessionStates?.ring_match_order

    if (session === 'testing') {
      return selectedRingMatchOrderDisplayIds.value.length > 1
        ? 'Preview is running on the selected Gilam Match Order screens.'
        : 'Preview is running on the selected Gilam Match Order screen.'
    }
    if (session === 'partially_degraded') {
      if ((summary.pendingSelectedCount ?? 0) > 0 && summary.liveCount > 0) {
        return `${summary.pendingSelectedCount} screen${summary.pendingSelectedCount === 1 ? '' : 's'} ready to re-add.`
      }
      if (summary.disconnectedCount > 0) {
        return `${summary.disconnectedCount} screen${summary.disconnectedCount === 1 ? '' : 's'} disconnected.`
      }
      if (unavailableCount > 0) {
        return `${unavailableCount} screen${unavailableCount === 1 ? '' : 's'} unavailable.`
      }
      return 'Some Gilam Match Order outputs need attention.'
    }
    if (session === 'live') {
      return liveRingMatchOrderDisplays.value.length > 1
        ? 'All selected Gilam Match Order outputs are live.'
        : `Live on ${selectedRingMatchOrderDisplays.value[0]?.label || 'the selected screen'}.`
    }
    if (session === 'ready') {
      return selectedRingMatchOrderDisplayIds.value.length > 1
        ? 'Gilam Match Order will start on the selected screens.'
        : 'Gilam Match Order will start on the selected screen.'
    }
    if (session === 'stopped') {
      return 'Gilam Match Order stopped. Selection stays saved.'
    }
    return selectedRingMatchOrderDisplayIds.value.length > 1
      ? 'Choose screens to prepare the next Gilam Match Order launch.'
      : 'Choose a screen to prepare the next Gilam Match Order launch.'
  })
  const selectedScoreboardDisplayLabel = computed(() => {
    if (!selectedScoreboardDisplayIds.value.length) {
      return isBroadcastMode.value ? 'Choose Screens' : 'Choose a Screen'
    }
    if (!isBroadcastMode.value) {
      return selectedScoreboardDisplays.value[0]?.label
        || preferredScoreboardDisplayInfo.value?.label
        || `Display ${selectedScoreboardDisplayIds.value[0]}`
    }
    if (selectedScoreboardDisplays.value.length === 1) return selectedScoreboardDisplays.value[0].label
    return 'Multiple screens selected'
  })
  const selectedScoreboardDisplayDescription = computed(() => {
    if (!selectedScoreboardDisplayIds.value.length) {
      return isBroadcastMode.value
        ? 'Select every screen that should show the public scoreboard.'
        : 'Choose the screen that should show the public scoreboard.'
    }
    if (missingSelectedDisplayIds.value.length > 0) {
      return 'Some saved selections are unavailable right now.'
    }
    if (!isBroadcastMode.value) {
      return 'This screen will be used when you launch.'
    }
    return 'The selected screens will receive the same live scoreboard.'
  })
  const selectedRingMatchOrderDisplayLabel = computed(() => {
    if (!selectedRingMatchOrderDisplayIds.value.length) return 'Choose Screen(s)'
    if (selectedRingMatchOrderDisplays.value.length === 1) return selectedRingMatchOrderDisplays.value[0].label
    return 'Multiple screens selected'
  })
  const selectedRingMatchOrderDisplayDescription = computed(() => {
    if (!selectedRingMatchOrderDisplayIds.value.length) {
      return 'Choose the screen or screens that should show the Gilam Match Order feed.'
    }
    if (missingRingMatchOrderDisplayIds.value.length > 0) {
      return 'Some saved Gilam Match Order selections are unavailable right now.'
    }
    return selectedRingMatchOrderDisplayIds.value.length > 1
      ? 'The selected screens will receive the same Admin-fed ring projection.'
      : 'This screen will be used when you launch Gilam Match Order.'
  })
  const shouldAutoExpandRingMatchOrderPanel = computed(() =>
    requiresRingMatchOrderDisplaySelection.value
    || missingRingMatchOrderDisplayEntries.value.length > 0
    || isRingMatchOrderLive.value
    || isRingMatchOrderPreviewActive.value
    || displayActionPending.value
  )

  function isControllerDisplay(displayId: string) {
    return displayId === displayState.value.controllerDisplayId
  }

  function getDisplayRoleLabel(display: ElectronDisplayInfo) {
    if (isControllerDisplay(display.id)) return 'Controller display'
    return display.isPrimary ? 'Main display' : 'External display'
  }

  function getDisplayCardDescription(displayId: string) {
    const status = getDisplayStatusEntry(displayId)
    if (isControllerDisplay(displayId)) {
      return status.selected
        ? 'Controller screen is included in output. Public scoreboard will also appear here.'
        : 'Controller stays active here. Usually left out of the public scoreboard.'
    }
    return status.selected ? 'Included in the current output selection.' : 'Click to include this screen.'
  }

  function getRingMatchOrderDisplayCardDescription(displayId: string) {
    const status = getDisplayStatusEntryForRole('ring_match_order', displayId)
    if (isControllerDisplay(displayId)) {
      return status.selected
        ? 'Controller screen is included in Gilam Match Order output. The Admin-fed projection will also appear here.'
        : 'Controller stays active here. Usually left free unless this screen should also host the ring projection.'
    }
    if (status.live) {
      return 'This screen is currently showing the Admin-fed Gilam Match Order projection.'
    }
    if (status.selected) {
      return 'Included in the current Gilam Match Order selection.'
    }
    const usageBadges = getDisplayRoleUsageBadges(displayId)
    if (usageBadges.length > 0) {
      return `Already in use by ${usageBadges.join(' and ')}. Launching Gilam Match Order here will reclaim the screen for this role.`
    }
    return 'Click to include this screen in the Gilam Match Order output.'
  }

  function applyDisplayState(nextState: ElectronDisplayState) {
    displayState.value = nextState
    displayErrorMessage.value = ''
    selectedScoreboardDisplayId.value = nextState.selectedScoreboardDisplayIds?.[0]
      ?? nextState.preferredPrimaryScoreboardDisplayId
      ?? nextState.preferredScoreboardDisplayId
      ?? nextState.scoreboardDisplayId
      ?? nextState.displays.find((display) => !display.isPrimary)?.id
      ?? nextState.displays[0]?.id
      ?? null
  }

  function getDisplayStatusEntry(displayId: string): ElectronPerDisplayStatus {
    return getDisplayStatusEntryForRole('scoreboard', displayId)
  }

  function getDisplayStatusEntryForRole(role: ElectronDisplayRole, displayId: string): ElectronPerDisplayStatus {
    return displayState.value.displayStatusesByRole?.[role]?.[displayId]
      ?? (role === 'scoreboard' ? displayState.value.displayStatuses?.[displayId] : null)
      ?? {
        state: 'available',
        selected: false,
        live: false,
        testing: false,
        disconnected: false,
        failed: false,
        removed: false,
        mode: 'hidden',
        lastError: null,
      }
  }

  function getKnownDisplayLabel(displayId: string) {
    if (!displayId) return 'Unavailable screen'
    const detectedDisplay = detectedDisplays.value.find((display) => display.id === displayId)
    if (detectedDisplay?.label) return detectedDisplay.label
    return knownDisplayLabels.value[displayId] || `Screen ${displayId}`
  }

  function getProfileDisplaySnapshots(profile: ElectronBroadcastProfile) {
    if (Array.isArray(profile.selectedDisplaySnapshots) && profile.selectedDisplaySnapshots.length > 0) {
      return profile.selectedDisplaySnapshots
    }
    return profile.selectedScoreboardDisplayIds.map((displayId) => ({
      id: displayId,
      label: getKnownDisplayLabel(displayId),
    }))
  }

  function getDisplayRoleUsageBadges(displayId: string) {
    const badges: string[] = []
    const scoreboardStatus = getDisplayStatusEntryForRole('scoreboard', displayId)
    const ringStatus = getDisplayStatusEntryForRole('ring_match_order', displayId)
    if (scoreboardStatus.selected || scoreboardStatus.live) badges.push('Scoreboard')
    if (ringStatus.selected || ringStatus.live) badges.push('Gilam Match Order')
    return badges
  }

  async function loadDisplayState(showErrors = false) {
    const bridge = options.getDisplayBridge()
    if (!bridge) {
      displayState.value = createDefaultDisplayState()
      selectedScoreboardDisplayId.value = null
      return null
    }

    displayActionPending.value = true
    try {
      const nextState = await bridge.getState()
      applyDisplayState(nextState)
      return nextState
    } catch (error: any) {
      const message = error?.message || 'Failed to read display state.'
      displayErrorMessage.value = message
      if (showErrors) options.showBanner(message, 'error', 4500)
      return null
    } finally {
      displayActionPending.value = false
    }
  }

  async function runDisplayAction(action: () => Promise<ElectronDisplayState>, fallbackMessage: string) {
    const bridge = options.getDisplayBridge()
    if (!bridge) {
      const message = 'Display controls are only available in the Electron desktop app.'
      displayErrorMessage.value = message
      options.showBanner(message, 'error', 4500)
      return null
    }

    displayActionPending.value = true
    try {
      const nextState = await action()
      applyDisplayState(nextState)
      return nextState
    } catch (error: any) {
      const message = error?.message || fallbackMessage
      displayErrorMessage.value = message
      options.showBanner(message, 'error', 4500)
      return null
    } finally {
      displayActionPending.value = false
    }
  }

  async function runRoleDisplayAction(
    action: (bridge: ElectronDisplayManagementBridge) => Promise<ElectronDisplayState>,
    fallbackMessage: string,
  ) {
    const bridge = options.getDisplayBridge()
    if (!bridge) {
      const message = 'Display controls are only available in the Electron desktop app.'
      displayErrorMessage.value = message
      options.showBanner(message, 'error', 4500)
      return null
    }

    return runDisplayAction(
      () => action(bridge),
      fallbackMessage,
    )
  }

  function ensureControllerOutputConfirmation() {
    if (!requiresControllerOutputConfirmation.value) return true
    const message = 'Confirm that Controller Screen should also show the public scoreboard before testing or launching.'
    displayErrorMessage.value = message
    options.showBanner(message, 'error', 4500)
    return false
  }

  async function setScoreboardOutputMode(mode: 'single' | 'broadcast') {
    const bridge = options.getDisplayBridge()
    if (!bridge) {
      const message = 'Display controls are only available in the Electron desktop app.'
      displayErrorMessage.value = message
      options.showBanner(message, 'error', 4500)
      return
    }

    await runDisplayAction(
      () => bridge.setOutputMode(mode),
      'Failed to change the scoreboard output mode.',
    )
  }

  async function syncSelectedDisplayTargets(displayIds: string[]) {
    const bridge = options.getDisplayBridge()
    if (!bridge) {
      const message = 'Display controls are only available in the Electron desktop app.'
      displayErrorMessage.value = message
      options.showBanner(message, 'error', 4500)
      return
    }

    await runDisplayAction(
      () => bridge.setSelectedDisplays(displayIds),
      'Failed to update the selected screens.',
    )
  }

  async function toggleScoreboardTarget(displayId: string) {
    const nextSelection = isBroadcastMode.value
      ? (selectedScoreboardDisplayIds.value.includes(displayId)
        ? selectedScoreboardDisplayIds.value.filter((id) => id !== displayId)
        : [...selectedScoreboardDisplayIds.value, displayId])
      : [displayId]

    await syncSelectedDisplayTargets(nextSelection)
  }

  async function selectAllExternalDisplayTargets() {
    const bridge = options.getDisplayBridge()
    if (!bridge) {
      const message = 'Display controls are only available in the Electron desktop app.'
      displayErrorMessage.value = message
      options.showBanner(message, 'error', 4500)
      return
    }

    await runDisplayAction(
      () => bridge.selectAllExternalDisplays(),
      'Failed to select all external screens.',
    )
  }

  async function clearSelectedDisplayTargets() {
    const bridge = options.getDisplayBridge()
    if (!bridge) {
      const message = 'Display controls are only available in the Electron desktop app.'
      displayErrorMessage.value = message
      options.showBanner(message, 'error', 4500)
      return
    }

    await runDisplayAction(
      () => bridge.clearSelectedDisplays(),
      'Failed to clear the selected screens.',
    )
  }

  async function removeDisplayTarget(displayId: string) {
    await syncSelectedDisplayTargets(selectedScoreboardDisplayIds.value.filter((id) => id !== displayId))
  }

  async function launchSelectedScoreboards() {
    const bridge = options.getDisplayBridge()
    if (!bridge) {
      const message = 'Display controls are only available in the Electron desktop app.'
      displayErrorMessage.value = message
      options.showBanner(message, 'error', 4500)
      return
    }

    if (!selectedScoreboardDisplayIds.value.length) {
      const message = isBroadcastMode.value
        ? 'Choose one or more scoreboard screens first.'
        : 'Choose a scoreboard screen first.'
      displayErrorMessage.value = message
      options.showBanner(message, 'error', 3500)
      return
    }

    if (!ensureControllerOutputConfirmation()) return
    if (!(await options.prepareScoreboardOutputChange())) return

    const nextState = await runDisplayAction(
      () => bridge.launchBroadcast(),
      'Failed to launch the selected scoreboard screens.',
    )

    options.handleSuccessfulLaunch(nextState)
  }

  async function testSelectedScreens() {
    const bridge = options.getDisplayBridge()
    if (!bridge) {
      const message = 'Display controls are only available in the Electron desktop app.'
      displayErrorMessage.value = message
      options.showBanner(message, 'error', 4500)
      return
    }

    if (!selectedScoreboardDisplayIds.value.length) {
      const message = isBroadcastMode.value
        ? 'Choose one or more scoreboard screens first.'
        : 'Choose a scoreboard screen first.'
      displayErrorMessage.value = message
      options.showBanner(message, 'error', 3500)
      return
    }

    if (!ensureControllerOutputConfirmation()) return

    await runDisplayAction(
      () => bridge.testSelectedDisplays(),
      'Failed to test the selected screens.',
    )
  }

  async function stopBroadcastOutputs() {
    const bridge = options.getDisplayBridge()
    if (!bridge) {
      const message = 'Display controls are only available in the Electron desktop app.'
      displayErrorMessage.value = message
      options.showBanner(message, 'error', 4500)
      return
    }

    await runDisplayAction(
      () => bridge.stopBroadcast(),
      'Failed to stop the live scoreboard outputs.',
    )
  }

  async function syncSelectedDisplayTargetsForRole(role: ElectronDisplayRole, displayIds: string[]) {
    return runRoleDisplayAction(
      (bridge) => bridge.setSelectedDisplaysForRole(role, displayIds),
      `Failed to update the selected ${role === 'ring_match_order' ? 'Gilam Match Order' : 'scoreboard'} screens.`,
    )
  }

  async function toggleRingMatchOrderTarget(displayId: string) {
    const nextSelection = selectedRingMatchOrderDisplayIds.value.includes(displayId)
      ? selectedRingMatchOrderDisplayIds.value.filter((id) => id !== displayId)
      : [...selectedRingMatchOrderDisplayIds.value, displayId]

    await syncSelectedDisplayTargetsForRole('ring_match_order', nextSelection)
  }

  async function selectAllRingMatchOrderDisplayTargets() {
    await runRoleDisplayAction(
      (bridge) => bridge.selectAllExternalDisplaysForRole('ring_match_order'),
      'Failed to select all Gilam Match Order screens.',
    )
  }

  async function clearRingMatchOrderDisplayTargets() {
    await runRoleDisplayAction(
      (bridge) => bridge.clearSelectedDisplaysForRole('ring_match_order'),
      'Failed to clear the Gilam Match Order screen selection.',
    )
  }

  async function removeRingMatchOrderDisplayTarget(displayId: string) {
    await syncSelectedDisplayTargetsForRole(
      'ring_match_order',
      selectedRingMatchOrderDisplayIds.value.filter((id) => id !== displayId),
    )
  }

  async function previewSelectedRingMatchOrderDisplays() {
    if (!selectedRingMatchOrderDisplayIds.value.length) {
      const message = 'Choose one or more Gilam Match Order screens first.'
      displayErrorMessage.value = message
      options.showBanner(message, 'error', 3500)
      return
    }

    await runRoleDisplayAction(
      (bridge) => bridge.testRoleDisplays('ring_match_order'),
      'Failed to preview the selected Gilam Match Order screens.',
    )
  }

  async function launchSelectedRingMatchOrderDisplays() {
    if (!selectedRingMatchOrderDisplayIds.value.length) {
      const message = 'Choose one or more Gilam Match Order screens first.'
      displayErrorMessage.value = message
      options.showBanner(message, 'error', 3500)
      return
    }

    if (!options.getSyncConfigurationReady() || !options.getRingMatchOrderProjectionKey()) {
      const message = 'Configure Admin Host, fallback tournament, and fallback gilam first so Gilam Match Order can follow the correct Admin projection.'
      displayErrorMessage.value = message
      options.showBanner(message, 'error', 4500)
      return
    }

    const nextState = await runRoleDisplayAction(
      (bridge) => bridge.launchRoleDisplays('ring_match_order'),
      'Failed to launch Gilam Match Order on the selected screens.',
    )

    options.handleSuccessfulLaunch(nextState)
  }

  async function stopRingMatchOrderOutputs() {
    await runRoleDisplayAction(
      (bridge) => bridge.stopRoleDisplays('ring_match_order'),
      'Failed to stop the Gilam Match Order outputs.',
    )
  }

  async function reAddRingMatchOrderOutput(displayId: string) {
    await runRoleDisplayAction(
      (bridge) => bridge.reAddRoleDisplay('ring_match_order', displayId),
      'Failed to re-add the selected Gilam Match Order screen.',
    )
  }

  async function reAddDisplayToBroadcast(displayId: string) {
    const bridge = options.getDisplayBridge()
    if (!bridge) {
      const message = 'Display controls are only available in the Electron desktop app.'
      displayErrorMessage.value = message
      options.showBanner(message, 'error', 4500)
      return
    }

    if (!(await options.prepareScoreboardOutputChange())) return

    await runDisplayAction(
      () => bridge.reAddScoreboardDisplay(displayId),
      'Failed to re-add the selected screen to the live broadcast.',
    )
  }

  async function saveCurrentBroadcastProfile() {
    const bridge = options.getDisplayBridge()
    if (!bridge) {
      const message = 'Display controls are only available in the Electron desktop app.'
      displayErrorMessage.value = message
      options.showBanner(message, 'error', 4500)
      return
    }

    if (!newBroadcastProfileName.value.trim()) {
      const message = 'Enter a profile name first.'
      displayErrorMessage.value = message
      options.showBanner(message, 'error', 3500)
      return
    }

    if (!selectedScoreboardDisplayIds.value.length && !selectedRingMatchOrderDisplayIds.value.length) {
      const message = 'Choose at least one screen for Scoreboard or Gilam Match Order before saving a display setup.'
      displayErrorMessage.value = message
      options.showBanner(message, 'error', 3500)
      return
    }

    const savedProfileName = newBroadcastProfileName.value.trim()
    const nextState = await runDisplayAction(
      () => bridge.saveBroadcastProfile(savedProfileName),
      'Failed to save the current screen profile.',
    )

    if (nextState) {
      newBroadcastProfileName.value = ''
      const savedProfile = (nextState.broadcastProfiles ?? []).find((profile) => profile.name === savedProfileName)
      if (savedProfile) selectedBroadcastProfileId.value = String(savedProfile.id)
    }
  }

  async function applyBroadcastProfile(profileId: string) {
    const bridge = options.getDisplayBridge()
    if (!bridge) {
      const message = 'Display controls are only available in the Electron desktop app.'
      displayErrorMessage.value = message
      options.showBanner(message, 'error', 4500)
      return
    }

    await runDisplayAction(
      () => bridge.applyBroadcastProfile(profileId),
      'Failed to apply the selected screen profile.',
    )
  }

  async function deleteBroadcastProfile(profileId: string) {
    const bridge = options.getDisplayBridge()
    if (!bridge) {
      const message = 'Display controls are only available in the Electron desktop app.'
      displayErrorMessage.value = message
      options.showBanner(message, 'error', 4500)
      return
    }

    await runDisplayAction(
      () => bridge.deleteBroadcastProfile(profileId),
      'Failed to delete the selected screen profile.',
    )
  }

  async function applySelectedBroadcastProfile() {
    if (!selectedBroadcastProfileId.value) {
      const message = 'Choose a saved display setup first.'
      displayErrorMessage.value = message
      options.showBanner(message, 'error', 3500)
      return
    }

    await applyBroadcastProfile(selectedBroadcastProfileId.value)
  }

  async function deleteSelectedBroadcastProfile() {
    if (!selectedBroadcastProfileId.value) {
      const message = 'Choose a saved display setup first.'
      displayErrorMessage.value = message
      options.showBanner(message, 'error', 3500)
      return
    }

    await deleteBroadcastProfile(selectedBroadcastProfileId.value)
  }

  async function moveScoreboardToSelectedDisplay() {
    if (!selectedScoreboardDisplayId.value) {
      const message = 'Choose a scoreboard display first.'
      displayErrorMessage.value = message
      options.showBanner(message, 'error', 3500)
      return
    }

    const bridge = options.getDisplayBridge()
    if (!bridge) {
      const message = 'Display controls are only available in the Electron desktop app.'
      displayErrorMessage.value = message
      options.showBanner(message, 'error', 4500)
      return
    }

    if (!(await options.prepareScoreboardOutputChange())) return

    await runDisplayAction(
      () => bridge.moveScoreboardToDisplay(selectedScoreboardDisplayId.value),
      'Failed to move the scoreboard.',
    )
  }

  async function moveControllerToSelectedDisplay() {
    if (!selectedScoreboardDisplayId.value) {
      const message = 'Choose a display for the controller first.'
      displayErrorMessage.value = message
      options.showBanner(message, 'error', 3500)
      return
    }

    const bridge = options.getDisplayBridge()
    if (!bridge) {
      const message = 'Display controls are only available in the Electron desktop app.'
      displayErrorMessage.value = message
      options.showBanner(message, 'error', 4500)
      return
    }

    await runDisplayAction(
      () => bridge.moveControllerToDisplay(selectedScoreboardDisplayId.value),
      'Failed to move the controller.',
    )
  }

  async function launchScoreboardToSelectedDisplay() {
    if (!selectedScoreboardDisplayId.value) {
      const message = 'Choose a scoreboard display first.'
      displayErrorMessage.value = message
      options.showBanner(message, 'error', 3500)
      return
    }

    const bridge = options.getDisplayBridge()
    if (!bridge) {
      const message = 'Display controls are only available in the Electron desktop app.'
      displayErrorMessage.value = message
      options.showBanner(message, 'error', 4500)
      return
    }

    if (!(await options.prepareScoreboardOutputChange())) return

    const nextState = await runDisplayAction(
      () => bridge.launchScoreboardOnDisplay(selectedScoreboardDisplayId.value),
      'Failed to launch the scoreboard.',
    )

    options.handleSuccessfulLaunch(nextState)
  }

  async function testSelectedDisplay() {
    if (!selectedScoreboardDisplayId.value) {
      const message = 'Choose a scoreboard display first.'
      displayErrorMessage.value = message
      options.showBanner(message, 'error', 3500)
      return
    }

    const bridge = options.getDisplayBridge()
    if (!bridge) {
      const message = 'Display controls are only available in the Electron desktop app.'
      displayErrorMessage.value = message
      options.showBanner(message, 'error', 4500)
      return
    }

    await runDisplayAction(
      () => bridge.testScoreboardDisplay(selectedScoreboardDisplayId.value),
      'Failed to test the selected display.',
    )
  }

  async function bringScoreboardToMainDisplay() {
    const bridge = options.getDisplayBridge()
    if (!bridge) {
      const message = 'Display controls are only available in the Electron desktop app.'
      displayErrorMessage.value = message
      options.showBanner(message, 'error', 4500)
      return
    }

    if (!(await options.prepareScoreboardOutputChange())) return

    await runDisplayAction(
      () => bridge.moveScoreboardToPrimary(),
      'Failed to bring the scoreboard to the main display.',
    )
  }

  async function closeScoreboardWindow() {
    const bridge = options.getDisplayBridge()
    if (!bridge) {
      const message = 'Display controls are only available in the Electron desktop app.'
      displayErrorMessage.value = message
      options.showBanner(message, 'error', 4500)
      return
    }

    await runDisplayAction(
      () => bridge.closeScoreboard(),
      'Failed to close the scoreboard.',
    )
  }

  async function swapDisplayAssignments() {
    const bridge = options.getDisplayBridge()
    if (!bridge) {
      const message = 'Display controls are only available in the Electron desktop app.'
      displayErrorMessage.value = message
      options.showBanner(message, 'error', 4500)
      return
    }

    await runDisplayAction(
      () => bridge.swapDisplays(),
      'Failed to swap controller and scoreboard displays.',
    )
  }

  async function rescanDisplayAssignments() {
    const bridge = options.getDisplayBridge()
    if (!bridge) {
      const message = 'Display controls are only available in the Electron desktop app.'
      displayErrorMessage.value = message
      options.showBanner(message, 'error', 4500)
      return
    }

    await runDisplayAction(
      () => bridge.rescanDisplays(),
      'Failed to re-scan displays.',
    )
  }

  return {
    displayState,
    displayActionPending,
    isDisplayAdvancedOpen,
    isDisplayScreenMenuOpen,
    newBroadcastProfileName,
    selectedBroadcastProfileId,
    controllerOutputConfirmed,
    displayErrorMessage,
    selectedScoreboardDisplayId,
    lastDisplayNoticeTimestamp,
    isDisplayManagementAvailable,
    detectedDisplays,
    controllerDisplayInfo,
    scoreboardDisplayInfo,
    preferredScoreboardDisplayInfo,
    selectedScoreboardDisplayIds,
    liveScoreboardDisplayIds,
    previewDisplayIds,
    missingSelectedDisplayIds,
    selectedRingMatchOrderDisplayIds,
    liveRingMatchOrderDisplayIds,
    previewRingMatchOrderDisplayIds,
    missingRingMatchOrderDisplayIds,
    knownDisplayLabels,
    selectedScoreboardDisplays,
    liveScoreboardDisplays,
    selectedRingMatchOrderDisplays,
    liveRingMatchOrderDisplays,
    broadcastProfiles,
    selectedBroadcastProfile,
    externalDisplays,
    isBroadcastMode,
    isDisplayTestActive,
    isScoreboardLive,
    isRingMatchOrderPreviewActive,
    isRingMatchOrderLive,
    requiresScoreboardDisplaySelection,
    requiresRingMatchOrderDisplaySelection,
    controllerDisplaySelected,
    requiresControllerOutputConfirmation,
    selectedOutputPerformanceWarning,
    missingSelectedDisplayEntries,
    missingRingMatchOrderDisplayEntries,
    displayModeLabel,
    scoreboardStatusLabel,
    scoreboardStatusToneClass,
    scoreboardStatusDescription,
    ringMatchOrderSummary,
    ringMatchOrderStatusLabel,
    ringMatchOrderStatusToneClass,
    ringMatchOrderStatusDescription,
    selectedScoreboardDisplayLabel,
    selectedScoreboardDisplayDescription,
    selectedRingMatchOrderDisplayLabel,
    selectedRingMatchOrderDisplayDescription,
    shouldAutoExpandRingMatchOrderPanel,
    applyDisplayState,
    getDisplayStatusEntry,
    getDisplayStatusEntryForRole,
    getKnownDisplayLabel,
    getProfileDisplaySnapshots,
    getDisplayRoleUsageBadges,
    isControllerDisplay,
    getDisplayRoleLabel,
    getDisplayCardDescription,
    getRingMatchOrderDisplayCardDescription,
    loadDisplayState,
    setScoreboardOutputMode,
    toggleScoreboardTarget,
    selectAllExternalDisplayTargets,
    clearSelectedDisplayTargets,
    removeDisplayTarget,
    ensureControllerOutputConfirmation,
    launchSelectedScoreboards,
    testSelectedScreens,
    stopBroadcastOutputs,
    toggleRingMatchOrderTarget,
    selectAllRingMatchOrderDisplayTargets,
    clearRingMatchOrderDisplayTargets,
    removeRingMatchOrderDisplayTarget,
    previewSelectedRingMatchOrderDisplays,
    launchSelectedRingMatchOrderDisplays,
    stopRingMatchOrderOutputs,
    reAddRingMatchOrderOutput,
    reAddDisplayToBroadcast,
    saveCurrentBroadcastProfile,
    applyBroadcastProfile,
    deleteBroadcastProfile,
    applySelectedBroadcastProfile,
    deleteSelectedBroadcastProfile,
    moveScoreboardToSelectedDisplay,
    moveControllerToSelectedDisplay,
    launchScoreboardToSelectedDisplay,
    testSelectedDisplay,
    bringScoreboardToMainDisplay,
    closeScoreboardWindow,
    swapDisplayAssignments,
    rescanDisplayAssignments,
  }
}
