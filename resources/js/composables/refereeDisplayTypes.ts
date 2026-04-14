import type { ElectronDisplayRole } from '@/composables/useRingMatchOrderProjection'

export interface ElectronDisplayBounds {
  x: number
  y: number
  width: number
  height: number
}

export interface ElectronDisplayInfo {
  id: string
  label: string
  bounds: ElectronDisplayBounds
  workArea: ElectronDisplayBounds
  scaleFactor: number
  rotation: number
  touchSupport: string
  internal: boolean
  isPrimary: boolean
  isExternal: boolean
  isScoreboardTarget: boolean
}

export interface ElectronDisplayNotice {
  level: 'info' | 'success' | 'warning'
  message: string
  timestamp: number
}

export interface ElectronPerDisplayStatus {
  state: 'available' | 'selected' | 'testing' | 'live' | 'disconnected' | 'failed'
  selected: boolean
  live: boolean
  testing: boolean
  disconnected: boolean
  failed: boolean
  removed: boolean
  mode: 'borderless-fullscreen' | 'recoverable-window' | 'hidden'
  lastError: string | null
}

export interface ElectronDisplaySessionSummary {
  selectedCount: number
  liveCount: number
  previewCount: number
  missingCount: number
  failedCount: number
  disconnectedCount: number
  pendingSelectedCount?: number
}

export interface ElectronBroadcastProfileDisplaySnapshot {
  id: string
  label: string
}

export interface ElectronBroadcastProfile {
  id: string
  name: string
  scoreboardOutputMode: 'single' | 'broadcast'
  selectedScoreboardDisplayIds: string[]
  selectedRingMatchOrderDisplayIds?: string[]
  selectedDisplayIdsByRole?: Record<ElectronDisplayRole, string[]>
  selectedDisplaySnapshots?: ElectronBroadcastProfileDisplaySnapshot[]
  ringMatchOrderDisplaySnapshots?: ElectronBroadcastProfileDisplaySnapshot[]
  selectedDisplaySnapshotsByRole?: Record<ElectronDisplayRole, ElectronBroadcastProfileDisplaySnapshot[]>
  preferredPrimaryScoreboardDisplayId: string | null
}

export interface ElectronDisplayState {
  displays: ElectronDisplayInfo[]
  displayRoles?: ElectronDisplayRole[]
  controllerDisplayId: string | null
  scoreboardDisplayId: string | null
  preferredScoreboardDisplayId: string | null
  preferredPrimaryScoreboardDisplayId?: string | null
  selectedScoreboardDisplayIds: string[]
  selectedRingMatchOrderDisplayIds?: string[]
  selectedDisplayIdsByRole?: Record<ElectronDisplayRole, string[]>
  liveScoreboardDisplayIds: string[]
  liveRingMatchOrderDisplayIds?: string[]
  liveDisplayIdsByRole?: Record<ElectronDisplayRole, string[]>
  previewDisplayId: string | null
  previewDisplayIds: string[]
  previewRingMatchOrderDisplayIds?: string[]
  previewDisplayIdsByRole?: Record<ElectronDisplayRole, string[]>
  missingSelectedDisplayIds: string[]
  missingRingMatchOrderDisplayIds?: string[]
  missingDisplayIdsByRole?: Record<ElectronDisplayRole, string[]>
  pendingSelectedDisplayIds?: string[]
  pendingRingMatchOrderDisplayIds?: string[]
  pendingDisplayIdsByRole?: Record<ElectronDisplayRole, string[]>
  knownDisplayLabels?: Record<string, string>
  scoreboardFullscreenPreference: boolean
  scoreboardMode: 'borderless-fullscreen' | 'recoverable-window' | 'hidden'
  scoreboardStatus: 'not-launched' | 'testing-display' | 'live' | 'disconnected'
  ringMatchOrderMode?: 'borderless-fullscreen' | 'recoverable-window' | 'hidden'
  ringMatchOrderStatus?: 'not-launched' | 'testing-display' | 'live' | 'disconnected'
  isFallbackToPrimary: boolean
  scoreboardOutputMode: 'single' | 'broadcast'
  broadcastSessionState: 'not_started' | 'ready' | 'testing' | 'live' | 'partially_degraded' | 'stopped'
  ringMatchOrderSessionState?: 'not_started' | 'ready' | 'testing' | 'live' | 'partially_degraded' | 'stopped'
  displayStatuses: Record<string, ElectronPerDisplayStatus>
  displayStatusesByRole?: Record<ElectronDisplayRole, Record<string, ElectronPerDisplayStatus>>
  broadcastProfiles?: ElectronBroadcastProfile[]
  sessionSummary: ElectronDisplaySessionSummary
  roleSessionStates?: Record<ElectronDisplayRole, 'not_started' | 'ready' | 'testing' | 'live' | 'partially_degraded' | 'stopped'>
  roleSessionSummaries?: Record<ElectronDisplayRole, ElectronDisplaySessionSummary>
  statusNotice: ElectronDisplayNotice | null
  diagnosticsEnabled: boolean
  updatedAt: number
}

export interface ElectronDisplayManagementBridge {
  getState: () => Promise<ElectronDisplayState>
  setOutputMode: (mode: 'single' | 'broadcast') => Promise<ElectronDisplayState>
  setSelectedDisplays: (displayIds: string[]) => Promise<ElectronDisplayState>
  addSelectedDisplay: (displayId: string | null) => Promise<ElectronDisplayState>
  removeSelectedDisplay: (displayId: string | null) => Promise<ElectronDisplayState>
  selectAllExternalDisplays: () => Promise<ElectronDisplayState>
  clearSelectedDisplays: () => Promise<ElectronDisplayState>
  testSelectedDisplays: () => Promise<ElectronDisplayState>
  launchBroadcast: () => Promise<ElectronDisplayState>
  stopBroadcast: () => Promise<ElectronDisplayState>
  reAddScoreboardDisplay: (displayId: string | null) => Promise<ElectronDisplayState>
  saveBroadcastProfile: (name: string) => Promise<ElectronDisplayState>
  applyBroadcastProfile: (profileId: string) => Promise<ElectronDisplayState>
  deleteBroadcastProfile: (profileId: string) => Promise<ElectronDisplayState>
  launchScoreboardOnDisplay: (displayId: string | null) => Promise<ElectronDisplayState>
  testScoreboardDisplay: (displayId: string | null) => Promise<ElectronDisplayState>
  moveControllerToDisplay: (displayId: string | null) => Promise<ElectronDisplayState>
  moveScoreboardToDisplay: (displayId: string | null) => Promise<ElectronDisplayState>
  moveScoreboardToPrimary: () => Promise<ElectronDisplayState>
  closeScoreboard: () => Promise<ElectronDisplayState>
  swapDisplays: () => Promise<ElectronDisplayState>
  rescanDisplays: () => Promise<ElectronDisplayState>
  toggleScoreboardFullscreen: (force?: boolean) => Promise<ElectronDisplayState>
  setSelectedDisplaysForRole: (role: ElectronDisplayRole, displayIds: string[]) => Promise<ElectronDisplayState>
  clearSelectedDisplaysForRole: (role: ElectronDisplayRole) => Promise<ElectronDisplayState>
  selectAllExternalDisplaysForRole: (role: ElectronDisplayRole) => Promise<ElectronDisplayState>
  testRoleDisplays: (role: ElectronDisplayRole) => Promise<ElectronDisplayState>
  launchRoleDisplays: (role: ElectronDisplayRole) => Promise<ElectronDisplayState>
  stopRoleDisplays: (role: ElectronDisplayRole) => Promise<ElectronDisplayState>
  moveRoleToDisplay: (role: ElectronDisplayRole, displayId: string | null) => Promise<ElectronDisplayState>
  reAddRoleDisplay: (role: ElectronDisplayRole, displayId: string | null) => Promise<ElectronDisplayState>
  onStateChanged: (callback: (state: ElectronDisplayState) => void) => () => void
}
