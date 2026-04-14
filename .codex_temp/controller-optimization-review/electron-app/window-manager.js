const { BrowserWindow, screen } = require('electron');
const { EventEmitter } = require('events');
const { cloneBounds } = require('./display-manager');
const { DISPLAY_ROLES, normalizeDisplayId, normalizeDisplayIds } = require('./settings-store');

function isDisplayRole(value) {
  return DISPLAY_ROLES.includes(value);
}

function createDisplayIdBucket() {
  return {
    scoreboard: [],
    ring_match_order: [],
  };
}

function createWindowMapBucket() {
  return {
    scoreboard: new Map(),
    ring_match_order: new Map(),
  };
}

function createWindowModeBucket() {
  return {
    scoreboard: new Map(),
    ring_match_order: new Map(),
  };
}

function createIssueBucket() {
  return {
    scoreboard: new Map(),
    ring_match_order: new Map(),
  };
}

function createIssueSetBucket() {
  return {
    scoreboard: new Set(),
    ring_match_order: new Set(),
  };
}

function toRoleMode(role, scoreboardOutputMode) {
  if (role === 'scoreboard') return scoreboardOutputMode === 'broadcast' ? 'broadcast' : 'single';
  return 'broadcast';
}

function appendQueryParams(rawUrl, params = {}) {
  if (!rawUrl) return null;

  try {
    const parsed = new URL(rawUrl);
    const nestedTargetUrl = parsed.searchParams.get('url');
    if (nestedTargetUrl) {
      try {
        const nestedParsed = new URL(nestedTargetUrl);
        Object.entries(params).forEach(([key, value]) => {
          if (value === undefined || value === null || value === '') {
            nestedParsed.searchParams.delete(key);
            return;
          }
          nestedParsed.searchParams.set(key, String(value));
        });
        parsed.searchParams.set('url', nestedParsed.toString());
        return parsed.toString();
      } catch (_nestedError) {
        // Fall back to applying params to the outer URL when the nested target cannot be parsed.
      }
    }

    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') {
        parsed.searchParams.delete(key);
        return;
      }
      parsed.searchParams.set(key, String(value));
    });
    return parsed.toString();
  } catch (_error) {
    return rawUrl;
  }
}

class WindowManager extends EventEmitter {
  constructor({ app, displayManager, settingsStore, preloadPath, logger = console }) {
    super();
    this.app = app;
    this.displayManager = displayManager;
    this.settingsStore = settingsStore;
    this.preloadPath = preloadPath;
    this.logger = logger;

    const savedSettings = this.settingsStore.getDisplaySettings();
    this.preferredPrimaryScoreboardDisplayId = normalizeDisplayId(
      savedSettings.preferredPrimaryScoreboardDisplayId || savedSettings.preferredScoreboardDisplayId
    );
    this.selectedScoreboardDisplayIds = normalizeDisplayIds(
      savedSettings.selectedScoreboardDisplayIds && savedSettings.selectedScoreboardDisplayIds.length
        ? savedSettings.selectedScoreboardDisplayIds
        : (this.preferredPrimaryScoreboardDisplayId ? [this.preferredPrimaryScoreboardDisplayId] : [])
    );
    this.scoreboardOutputMode = savedSettings.scoreboardOutputMode === 'broadcast' ? 'broadcast' : 'single';
    this.broadcastProfiles = Array.isArray(savedSettings.broadcastProfiles) ? savedSettings.broadcastProfiles : [];
    if (this.scoreboardOutputMode !== 'broadcast' && this.selectedScoreboardDisplayIds.length > 1) {
      this.selectedScoreboardDisplayIds = this.selectedScoreboardDisplayIds.slice(0, 1);
    }

    this.selectedRingMatchOrderDisplayIds = normalizeDisplayIds(
      savedSettings.selectedRingMatchOrderDisplayIds
    );
    this.scoreboardFullscreenPreference = savedSettings.scoreboardFullscreen !== false;
    this.controllerWindow = null;
    this.scoreboardWindows = new Map();
    this.scoreboardWindowModes = new Map();
    this.scoreboardUrl = null;
    this.ringMatchOrderWindows = new Map();
    this.ringMatchOrderWindowModes = new Map();
    this.ringMatchOrderUrl = null;
    this.displayTestWindows = new Map();
    this.displayTestTimers = new Map();
    this.ringMatchOrderPreviewWindows = new Map();
    this.failedDisplayErrors = new Map();
    this.disconnectedDisplayIds = new Set();
    this.removedDisplayIds = new Set();
    this.ringMatchOrderFailedDisplayErrors = new Map();
    this.ringMatchOrderDisconnectedDisplayIds = new Set();
    this.ringMatchOrderRemovedDisplayIds = new Set();
    this.knownDisplayLabels = new Map();
    this.statusNotice = null;
    this.broadcastSessionState = this.selectedScoreboardDisplayIds.length ? 'ready' : 'not_started';
    this.ringMatchOrderSessionState = this.selectedRingMatchOrderDisplayIds.length ? 'ready' : 'not_started';
    this.debugEnabled = !this.app.isPackaged || process.env.KURASH_DISPLAY_DEBUG === '1';
    this.rememberKnownDisplayLabels();

    const initialDisplaySnapshot = this.captureDisplaySnapshot();
    this.lastKnownPrimaryDisplayId = initialDisplaySnapshot.primaryDisplayId;
    this.lastKnownDisplayIds = initialDisplaySnapshot.displayIds;

    this.handleDisplayAdded = (_event, addedDisplay) => this.reconcileDisplays({
      reason: `display-added:${this.describeDisplay(addedDisplay)}`,
      notice: this.buildReconnectNotice(addedDisplay),
    });

    this.handleDisplayRemoved = (_event, removedDisplay) => {
      const removedId = normalizeDisplayId(removedDisplay && removedDisplay.id);
      if (!removedId) {
        return this.reconcileDisplays({ reason: 'display-removed:unknown' });
      }

      if (this.displayTestWindows.has(removedId)) {
        this.closeDisplayTestWindowForDisplay(removedId, { silent: true, emit: false });
      }
      if (this.ringMatchOrderPreviewWindows.has(removedId)) {
        this.closeRingMatchOrderPreviewWindowForDisplay(removedId, { silent: true, emit: false });
      }

      const hadLiveOutput = this.scoreboardWindows.has(removedId);
      if (hadLiveOutput && this.scoreboardOutputMode === 'single') {
        this.destroyScoreboardWindowForDisplay(removedId, { silent: true });
        this.disconnectedDisplayIds.add(removedId);
        this.removedDisplayIds.add(removedId);
        const primaryDisplay = this.displayManager.getPrimaryDisplay();
        if (!primaryDisplay) {
          this.statusNotice = this.createNotice('warning', 'The selected scoreboard display disconnected and no fallback display is available.');
          this.updateSessionStateFromOutputs({ stoppedScoreboard: true });
          return this.emitStateChange(`display-removed:${this.describeDisplay(removedDisplay)}`);
        }

        return this.launchBroadcast({
          manual: false,
          preserveSelection: true,
          outputMode: 'single',
          requestedDisplayIds: [primaryDisplay.id],
          notice: { level: 'warning', message: 'The selected scoreboard display disconnected. Scoreboard moved to the main display safely.' },
        });
      }

      const hadRingLiveOutput = this.ringMatchOrderWindows.has(removedId);
      if (hadRingLiveOutput) {
        this.destroyRingMatchOrderWindowForDisplay(removedId, { silent: true });
        this.ringMatchOrderDisconnectedDisplayIds.add(removedId);
        this.ringMatchOrderRemovedDisplayIds.add(removedId);
      }

      const notice = hadLiveOutput
        ? { level: 'warning', message: `${this.describeDisplay(removedDisplay)} disconnected. Broadcast continues on remaining screens.` }
        : (hadRingLiveOutput
          ? { level: 'warning', message: `${this.describeDisplay(removedDisplay)} disconnected. Gilam Match Order continues on remaining screens.` }
          : ((this.selectedScoreboardDisplayIds.includes(removedId) || this.selectedRingMatchOrderDisplayIds.includes(removedId))
            ? { level: 'warning', message: `${this.describeDisplay(removedDisplay)} is unavailable. Re-add it after it returns.` }
            : null));

      return this.reconcileDisplays({
        reason: `display-removed:${this.describeDisplay(removedDisplay)}`,
        notice,
      });
    };

    this.handleDisplayMetricsChanged = (_event, changedDisplay, changedMetrics) => {
      const metrics = Array.isArray(changedMetrics) ? changedMetrics.join(', ') : 'unknown';
      this.reconcileDisplays({
        reason: `display-metrics-changed:${this.describeDisplay(changedDisplay)}:${metrics}`,
      });
    };
  }

  registerDisplayListeners() {
    screen.on('display-added', this.handleDisplayAdded);
    screen.on('display-removed', this.handleDisplayRemoved);
    screen.on('display-metrics-changed', this.handleDisplayMetricsChanged);
  }

  unregisterDisplayListeners() {
    screen.removeListener('display-added', this.handleDisplayAdded);
    screen.removeListener('display-removed', this.handleDisplayRemoved);
    screen.removeListener('display-metrics-changed', this.handleDisplayMetricsChanged);
  }

  createControllerWindow(url) {
    const primaryDisplay = this.displayManager.getPrimaryDisplay();
    this.controllerWindow = new BrowserWindow({
      title: 'Gilam Controller',
      show: false,
      frame: false,
      autoHideMenuBar: true,
      fullscreen: false,
      fullscreenable: false,
      kiosk: false,
      resizable: false,
      backgroundColor: '#0f172a',
      webPreferences: { nodeIntegration: false, contextIsolation: true, preload: this.preloadPath },
    });
    this.controllerWindow.setMenu(null);
    this.applyWindowBounds(this.controllerWindow, cloneBounds(primaryDisplay.bounds), { alwaysOnTop: false });
    this.controllerWindow.loadURL(url);
    this.controllerWindow.webContents.on('did-finish-load', () => this.pushStateToController());
    return this.controllerWindow;
  }

  createScoreboardWindow(url) {
    this.scoreboardUrl = url;
    return null;
  }

  createRingMatchOrderWindow(url) {
    this.ringMatchOrderUrl = url;
    return null;
  }

  createScoreboardWindowForDisplay(displayId) {
    return this.ensureScoreboardWindowForDisplay(displayId);
  }

  getPublicWindowUrl(role, options = {}) {
    const preview = options.preview === true;
    if (role === 'ring_match_order') {
      return appendQueryParams(this.ringMatchOrderUrl, preview ? { preview: '1' } : {});
    }

    return this.scoreboardUrl;
  }

  getLiveWindowsForRole(role) {
    return role === 'ring_match_order' ? this.ringMatchOrderWindows : this.scoreboardWindows;
  }

  getWindowModesForRole(role) {
    return role === 'ring_match_order' ? this.ringMatchOrderWindowModes : this.scoreboardWindowModes;
  }

  getPreviewWindowsForRole(role) {
    return role === 'ring_match_order' ? this.ringMatchOrderPreviewWindows : this.displayTestWindows;
  }

  getFailedDisplayErrorsForRole(role) {
    return role === 'ring_match_order' ? this.ringMatchOrderFailedDisplayErrors : this.failedDisplayErrors;
  }

  getDisconnectedDisplayIdsForRole(role) {
    return role === 'ring_match_order' ? this.ringMatchOrderDisconnectedDisplayIds : this.disconnectedDisplayIds;
  }

  getRemovedDisplayIdsForRole(role) {
    return role === 'ring_match_order' ? this.ringMatchOrderRemovedDisplayIds : this.removedDisplayIds;
  }

  getSelectedDisplayIdsForRole(role) {
    return role === 'ring_match_order' ? this.selectedRingMatchOrderDisplayIds : this.selectedScoreboardDisplayIds;
  }

  setSelectedDisplayIdsForRole(role, displayIds) {
    if (role === 'ring_match_order') {
      this.selectedRingMatchOrderDisplayIds = normalizeDisplayIds(displayIds);
      return this.selectedRingMatchOrderDisplayIds;
    }

    this.selectedScoreboardDisplayIds = normalizeDisplayIds(displayIds);
    return this.selectedScoreboardDisplayIds;
  }

  getSessionStateForRole(role) {
    return role === 'ring_match_order' ? this.ringMatchOrderSessionState : this.broadcastSessionState;
  }

  setSessionStateForRole(role, value) {
    if (role === 'ring_match_order') {
      this.ringMatchOrderSessionState = value;
      return;
    }
    this.broadcastSessionState = value;
  }

  getWindowTitleForRole(role, displayId, preview = false) {
    const suffix = preview ? ' Preview' : '';
    if (role === 'ring_match_order') return `Gilam Match Order ${displayId}${suffix}`;
    return `Live Scoreboard ${displayId}${suffix}`;
  }

  createPublicWindow(role, displayId, options = {}) {
    const normalizedId = normalizeDisplayId(displayId);
    if (!normalizedId) return null;

    const preview = options.preview === true;
    const targetMap = preview ? this.getPreviewWindowsForRole(role) : this.getLiveWindowsForRole(role);
    const existingWindow = targetMap.get(normalizedId);
    if (existingWindow && !existingWindow.isDestroyed()) return existingWindow;

    const url = this.getPublicWindowUrl(role, { preview });
    if (!url) return null;

    const win = new BrowserWindow({
      title: this.getWindowTitleForRole(role, normalizedId, preview),
      show: false,
      frame: false,
      autoHideMenuBar: true,
      fullscreen: false,
      fullscreenable: false,
      kiosk: false,
      resizable: false,
      backgroundColor: '#0f172a',
      webPreferences: { nodeIntegration: false, contextIsolation: true, preload: this.preloadPath },
    });

    win.setMenu(null);
    win.loadURL(url);
    win.on('closed', () => {
      const trackedWindow = targetMap.get(normalizedId);
      if (trackedWindow && trackedWindow !== win) return;
      targetMap.delete(normalizedId);
      if (!preview) this.getWindowModesForRole(role).delete(normalizedId);

      if (!preview) {
        this.getFailedDisplayErrorsForRole(role).set(
          normalizedId,
          `${role === 'ring_match_order' ? 'Gilam Match Order' : 'Scoreboard'} window closed unexpectedly.`
        );
        this.getDisconnectedDisplayIdsForRole(role).add(normalizedId);
        this.updateSessionStateFromOutputs();
        this.statusNotice = this.createNotice('warning', `${this.describeDisplay(normalizedId)} closed unexpectedly.`);
        this.emitStateChange(`${role}-window-closed:${normalizedId}`);
        return;
      }

      if (role === 'scoreboard') {
        this.clearDisplayTestTimer(normalizedId);
      }
      this.updateSessionStateFromOutputs();
      this.emitStateChange(`${role}-preview-closed:${normalizedId}`);
    });

    targetMap.set(normalizedId, win);
    return win;
  }

  ensureScoreboardWindowForDisplay(displayId) {
    return this.createPublicWindow('scoreboard', displayId);
  }

  ensureRingMatchOrderWindowForDisplay(displayId) {
    return this.createPublicWindow('ring_match_order', displayId);
  }

  ensureRingMatchOrderPreviewWindowForDisplay(displayId) {
    return this.createPublicWindow('ring_match_order', displayId, { preview: true });
  }

  ensureDisplayTestWindowForDisplay(displayId) {
    const normalizedId = normalizeDisplayId(displayId);
    if (!normalizedId) return null;

    const existingWindow = this.displayTestWindows.get(normalizedId);
    if (existingWindow && !existingWindow.isDestroyed()) return existingWindow;

    const win = new BrowserWindow({
      title: `Scoreboard Display Test ${normalizedId}`,
      show: false,
      frame: false,
      autoHideMenuBar: true,
      fullscreen: false,
      fullscreenable: false,
      kiosk: false,
      resizable: false,
      movable: false,
      focusable: false,
      skipTaskbar: true,
      backgroundColor: '#03111f',
      webPreferences: { nodeIntegration: false, contextIsolation: true },
    });

    win.setMenu(null);
    win.setIgnoreMouseEvents(true);
    win.on('closed', () => {
      const trackedWindow = this.displayTestWindows.get(normalizedId);
      if (trackedWindow && trackedWindow !== win) return;
      this.displayTestWindows.delete(normalizedId);
      this.clearDisplayTestTimer(normalizedId);
      this.updateSessionStateFromOutputs();
      this.emitStateChange(`display-test-closed:${normalizedId}`);
    });

    this.displayTestWindows.set(normalizedId, win);
    return win;
  }

  hasScoreboardWindow() {
    return this.getLiveScoreboardDisplayIds().length > 0;
  }

  hasRingMatchOrderWindow() {
    return this.getLiveRingMatchOrderDisplayIds().length > 0;
  }

  hasDisplayTestWindow() {
    return this.getPreviewDisplayIds().length > 0;
  }

  hasRingMatchOrderPreviewWindow() {
    return this.getPreviewRingMatchOrderDisplayIds().length > 0;
  }

  isScoreboardLaunched() {
    return this.hasScoreboardWindow();
  }

  isRingMatchOrderLaunched() {
    return this.hasRingMatchOrderWindow();
  }

  isDisplayTestActive() {
    return this.hasDisplayTestWindow();
  }

  isRingMatchOrderPreviewActive() {
    return this.hasRingMatchOrderPreviewWindow();
  }

  getControllerDisplay() {
    return this.displayManager.getDisplayForWindow(this.controllerWindow);
  }

  getScoreboardDisplay() {
    const liveIds = this.getLiveScoreboardDisplayIds();
    if (!liveIds.length) return null;
    const preferredLiveId = liveIds.includes(this.preferredPrimaryScoreboardDisplayId)
      ? this.preferredPrimaryScoreboardDisplayId
      : liveIds[0];
    return this.displayManager.getDisplayById(preferredLiveId) || null;
  }

  getPreviewDisplay() {
    const previewIds = this.getPreviewDisplayIds();
    if (!previewIds.length) return null;
    const preferredPreviewId = previewIds.includes(this.preferredPrimaryScoreboardDisplayId)
      ? this.preferredPrimaryScoreboardDisplayId
      : previewIds[0];
    return this.displayManager.getDisplayById(preferredPreviewId) || null;
  }

  getLiveScoreboardDisplayIds() {
    return Array.from(this.scoreboardWindows.entries())
      .filter(([, win]) => win && !win.isDestroyed())
      .map(([displayId]) => displayId);
  }

  getLiveRingMatchOrderDisplayIds() {
    return Array.from(this.ringMatchOrderWindows.entries())
      .filter(([, win]) => win && !win.isDestroyed())
      .map(([displayId]) => displayId);
  }

  getPreviewDisplayIds() {
    return Array.from(this.displayTestWindows.entries())
      .filter(([, win]) => win && !win.isDestroyed())
      .map(([displayId]) => displayId);
  }

  getPreviewRingMatchOrderDisplayIds() {
    return Array.from(this.ringMatchOrderPreviewWindows.entries())
      .filter(([, win]) => win && !win.isDestroyed())
      .map(([displayId]) => displayId);
  }

  createNotice(level, message) {
    return { level, message, timestamp: Date.now() };
  }

  rememberKnownDisplayLabels() {
    this.displayManager.getAllDisplays().forEach((display) => {
      const displayId = normalizeDisplayId(display && display.id);
      if (!displayId) return;
      this.knownDisplayLabels.set(displayId, display.label || `Display ${displayId}`);
    });
  }

  captureDisplaySnapshot() {
    this.rememberKnownDisplayLabels();
    const displays = this.displayManager.getAllDisplays();
    return {
      displayIds: displays.map((display) => display.id),
      primaryDisplayId: displays.find((display) => display.isPrimary)?.id || null,
    };
  }

  detectDisplayTopologyChange() {
    const currentSnapshot = this.captureDisplaySnapshot();
    const previousPrimaryDisplayId = this.lastKnownPrimaryDisplayId || null;
    const previousDisplayIds = Array.isArray(this.lastKnownDisplayIds) ? this.lastKnownDisplayIds : [];
    const hadPreviousSnapshot = previousDisplayIds.length > 0 || !!previousPrimaryDisplayId;
    const addedIds = currentSnapshot.displayIds.filter((displayId) => !previousDisplayIds.includes(displayId));
    const removedIds = previousDisplayIds.filter((displayId) => !currentSnapshot.displayIds.includes(displayId));
    const primaryChanged = hadPreviousSnapshot
      && !!currentSnapshot.primaryDisplayId
      && currentSnapshot.primaryDisplayId !== previousPrimaryDisplayId;

    this.lastKnownPrimaryDisplayId = currentSnapshot.primaryDisplayId;
    this.lastKnownDisplayIds = [...currentSnapshot.displayIds];

    return {
      addedIds,
      removedIds,
      primaryChanged,
      currentSnapshot,
    };
  }

  buildReconnectNotice(display) {
    const displayId = normalizeDisplayId(display && display.id);
    if (!displayId) return null;

    const selectedRoles = DISPLAY_ROLES.filter((role) => this.getSelectedDisplayIdsForRole(role).includes(displayId));
    if (!selectedRoles.length) return null;

    const roleLabel = selectedRoles.includes('scoreboard') && selectedRoles.includes('ring_match_order')
      ? 'a saved display role'
      : (selectedRoles[0] === 'ring_match_order' ? 'Gilam Match Order' : 'Scoreboard');
    return {
      level: 'success',
      message: `${this.describeDisplay(display)} is available again. Re-add it to ${roleLabel} when ready.`,
    };
  }

  clearDisplayTestTimer(displayId) {
    const normalizedId = normalizeDisplayId(displayId);
    if (!normalizedId) return;
    const timer = this.displayTestTimers.get(normalizedId);
    if (timer) clearTimeout(timer);
    this.displayTestTimers.delete(normalizedId);
  }

  clearAllDisplayTestTimers() {
    Array.from(this.displayTestTimers.keys()).forEach((displayId) => this.clearDisplayTestTimer(displayId));
  }

  getRecoverableBounds(display) {
    const workArea = display.workArea || display.bounds;
    const width = Math.min(workArea.width, Math.max(960, Math.round(workArea.width * 0.72)));
    const height = Math.min(workArea.height, Math.max(540, Math.round(workArea.height * 0.72)));
    return {
      x: workArea.x + Math.round((workArea.width - width) / 2),
      y: workArea.y + Math.round((workArea.height - height) / 2),
      width,
      height,
    };
  }

  applyWindowBounds(win, bounds, { alwaysOnTop, show = true }) {
    if (!win || win.isDestroyed()) return false;
    if (win.isMinimized()) win.restore();
    win.setAlwaysOnTop(alwaysOnTop, alwaysOnTop ? 'screen-saver' : 'normal');
    win.setBounds(bounds, false);
    if (show && !win.isVisible()) win.show();
    return true;
  }

  applyControllerPlacement(display) {
    if (!display) return false;
    return this.applyWindowBounds(this.controllerWindow, cloneBounds(display.bounds), { alwaysOnTop: false });
  }

  hideWindow(win) {
    if (!win || win.isDestroyed()) return;
    win.setAlwaysOnTop(false, 'normal');
    if (win.isVisible()) win.hide();
  }

  sanitizeSelectedDisplayIds(displayIds, mode = this.scoreboardOutputMode) {
    const normalizedIds = normalizeDisplayIds(displayIds);
    if (mode === 'broadcast') return normalizedIds;
    return normalizedIds.slice(0, 1);
  }

  sanitizeSelectedDisplayIdsForRole(role, displayIds, mode = null) {
    const normalizedMode = mode || toRoleMode(role, this.scoreboardOutputMode);
    return this.sanitizeSelectedDisplayIds(displayIds, normalizedMode);
  }

  getLaunchTargetIds(requestedDisplayIds = null, outputMode = this.scoreboardOutputMode) {
    const requestedIds = requestedDisplayIds === null
      ? this.selectedScoreboardDisplayIds
      : requestedDisplayIds;
    const normalizedIds = this.sanitizeSelectedDisplayIds(requestedIds, outputMode);
    if (normalizedIds.length > 0) return normalizedIds;
    if (outputMode === 'single' && this.preferredPrimaryScoreboardDisplayId) {
      return [this.preferredPrimaryScoreboardDisplayId];
    }
    return [];
  }

  getLaunchTargetIdsForRole(role, requestedDisplayIds = null, outputMode = null) {
    const requestedIds = requestedDisplayIds === null
      ? this.getSelectedDisplayIdsForRole(role)
      : requestedDisplayIds;
    const normalizedMode = outputMode || toRoleMode(role, this.scoreboardOutputMode);
    const normalizedIds = this.sanitizeSelectedDisplayIdsForRole(role, requestedIds, normalizedMode);
    if (normalizedIds.length > 0) return normalizedIds;
    if (role === 'scoreboard' && normalizedMode === 'single' && this.preferredPrimaryScoreboardDisplayId) {
      return [this.preferredPrimaryScoreboardDisplayId];
    }
    return [];
  }

  getAvailableSelectedDisplays(displayIds = null) {
    return this.getLaunchTargetIds(displayIds, this.scoreboardOutputMode)
      .map((displayId) => this.displayManager.getDisplayById(displayId))
      .filter(Boolean);
  }

  getAvailableSelectedDisplaysForRole(role, displayIds = null) {
    return this.getLaunchTargetIdsForRole(role, displayIds)
      .map((displayId) => this.displayManager.getDisplayById(displayId))
      .filter(Boolean);
  }

  getMissingSelectedDisplayIds(displayIds = null) {
    return this.getLaunchTargetIds(displayIds, this.scoreboardOutputMode)
      .filter((displayId) => !this.displayManager.getDisplayById(displayId));
  }

  getMissingSelectedDisplayIdsForRole(role, displayIds = null) {
    return this.getLaunchTargetIdsForRole(role, displayIds)
      .filter((displayId) => !this.displayManager.getDisplayById(displayId));
  }

  getPendingSelectedDisplayIds(displayIds = null) {
    const liveIds = new Set(this.getLiveScoreboardDisplayIds());
    const previewIds = new Set(this.getPreviewDisplayIds());
    return this.getLaunchTargetIds(displayIds, this.scoreboardOutputMode)
      .filter((displayId) => !!this.displayManager.getDisplayById(displayId))
      .filter((displayId) => !liveIds.has(displayId) && !previewIds.has(displayId));
  }

  getPendingSelectedDisplayIdsForRole(role, displayIds = null) {
    const liveIds = new Set(role === 'ring_match_order'
      ? this.getLiveRingMatchOrderDisplayIds()
      : this.getLiveScoreboardDisplayIds());
    const previewIds = new Set(role === 'ring_match_order'
      ? this.getPreviewRingMatchOrderDisplayIds()
      : this.getPreviewDisplayIds());
    return this.getLaunchTargetIdsForRole(role, displayIds)
      .filter((displayId) => !!this.displayManager.getDisplayById(displayId))
      .filter((displayId) => !liveIds.has(displayId) && !previewIds.has(displayId));
  }

  getRoleOccupancy(displayId) {
    const normalizedId = normalizeDisplayId(displayId);
    if (!normalizedId) return { liveRoles: [], previewRoles: [], selectedRoles: [] };

    return {
      liveRoles: DISPLAY_ROLES.filter((role) => {
        const liveIds = role === 'ring_match_order'
          ? this.getLiveRingMatchOrderDisplayIds()
          : this.getLiveScoreboardDisplayIds();
        return liveIds.includes(normalizedId);
      }),
      previewRoles: DISPLAY_ROLES.filter((role) => {
        const previewIds = role === 'ring_match_order'
          ? this.getPreviewRingMatchOrderDisplayIds()
          : this.getPreviewDisplayIds();
        return previewIds.includes(normalizedId);
      }),
      selectedRoles: DISPLAY_ROLES.filter((role) => this.getSelectedDisplayIdsForRole(role).includes(normalizedId)),
    };
  }

  releaseDisplaysFromOtherRoles(role, displayIds, options = {}) {
    const normalizedIds = normalizeDisplayIds(displayIds);
    if (!normalizedIds.length) return;

    const { clearSelection = true, closeLive = true, closePreview = true } = options;
    const conflictingRoles = DISPLAY_ROLES.filter((entry) => entry !== role);

    conflictingRoles.forEach((conflictingRole) => {
      normalizedIds.forEach((displayId) => {
        if (closeLive) {
          if (conflictingRole === 'ring_match_order') {
            this.destroyRingMatchOrderWindowForDisplay(displayId, { clearFailures: true });
          } else {
            this.destroyScoreboardWindowForDisplay(displayId, { clearFailures: true });
          }
        }

        if (closePreview) {
          if (conflictingRole === 'ring_match_order') {
            this.closeRingMatchOrderPreviewWindowForDisplay(displayId, { silent: true, emit: false });
          } else {
            this.closeDisplayTestWindowForDisplay(displayId, { silent: true, emit: false });
          }
        }

        if (clearSelection) {
          const nextIds = this.getSelectedDisplayIdsForRole(conflictingRole).filter((id) => id !== displayId);
          this.setSelectedDisplayIdsForRole(conflictingRole, nextIds);
        }
      });
    });
  }

  pruneRuntimeTracking() {
    DISPLAY_ROLES.forEach((role) => {
      const keepIds = new Set([
        ...this.getSelectedDisplayIdsForRole(role),
        ...(role === 'ring_match_order' ? this.getLiveRingMatchOrderDisplayIds() : this.getLiveScoreboardDisplayIds()),
        ...(role === 'ring_match_order' ? this.getPreviewRingMatchOrderDisplayIds() : this.getPreviewDisplayIds()),
      ]);

      Array.from(this.getFailedDisplayErrorsForRole(role).keys()).forEach((displayId) => {
        if (!keepIds.has(displayId)) this.getFailedDisplayErrorsForRole(role).delete(displayId);
      });
      Array.from(this.getDisconnectedDisplayIdsForRole(role)).forEach((displayId) => {
        if (!keepIds.has(displayId)) this.getDisconnectedDisplayIdsForRole(role).delete(displayId);
      });
      Array.from(this.getRemovedDisplayIdsForRole(role)).forEach((displayId) => {
        if (!keepIds.has(displayId)) this.getRemovedDisplayIdsForRole(role).delete(displayId);
      });
    });
  }

  updateSessionStateFromOutputs({ stoppedScoreboard = false, stoppedRingMatchOrder = false } = {}) {
    const liveCount = this.getLiveScoreboardDisplayIds().length;
    const previewCount = this.getPreviewDisplayIds().length;
    const selectedCount = this.selectedScoreboardDisplayIds.length;
    const missingCount = this.getMissingSelectedDisplayIds().length;
    const failedCount = this.failedDisplayErrors.size;
    const disconnectedCount = this.disconnectedDisplayIds.size;
    const pendingSelectedCount = this.getPendingSelectedDisplayIds().length;
    const issueCount = missingCount + failedCount + disconnectedCount + pendingSelectedCount;

    if (stoppedScoreboard) {
      this.broadcastSessionState = 'stopped';
    } else if (previewCount > 0) {
      this.broadcastSessionState = 'testing';
    } else if (liveCount > 0) {
      this.broadcastSessionState = issueCount > 0 ? 'partially_degraded' : 'live';
    } else if (selectedCount > 0) {
      this.broadcastSessionState = this.broadcastSessionState === 'stopped' ? 'stopped' : 'ready';
    } else {
      this.broadcastSessionState = this.broadcastSessionState === 'stopped' ? 'stopped' : 'not_started';
    }

    const ringLiveCount = this.getLiveRingMatchOrderDisplayIds().length;
    const ringPreviewCount = this.getPreviewRingMatchOrderDisplayIds().length;
    const ringSelectedCount = this.selectedRingMatchOrderDisplayIds.length;
    const ringMissingCount = this.getMissingSelectedDisplayIdsForRole('ring_match_order').length;
    const ringFailedCount = this.ringMatchOrderFailedDisplayErrors.size;
    const ringDisconnectedCount = this.ringMatchOrderDisconnectedDisplayIds.size;
    const ringPendingSelectedCount = this.getPendingSelectedDisplayIdsForRole('ring_match_order').length;
    const ringIssueCount = ringMissingCount + ringFailedCount + ringDisconnectedCount + ringPendingSelectedCount;

    if (stoppedRingMatchOrder) {
      this.ringMatchOrderSessionState = 'stopped';
    } else if (ringPreviewCount > 0) {
      this.ringMatchOrderSessionState = 'testing';
    } else if (ringLiveCount > 0) {
      this.ringMatchOrderSessionState = ringIssueCount > 0 ? 'partially_degraded' : 'live';
    } else if (ringSelectedCount > 0) {
      this.ringMatchOrderSessionState = this.ringMatchOrderSessionState === 'stopped' ? 'stopped' : 'ready';
    } else {
      this.ringMatchOrderSessionState = this.ringMatchOrderSessionState === 'stopped' ? 'stopped' : 'not_started';
    }
  }

  persistDisplayPreferences() {
    this.settingsStore.updateDisplaySettings({
      preferredScoreboardDisplayId: this.preferredPrimaryScoreboardDisplayId,
      preferredPrimaryScoreboardDisplayId: this.preferredPrimaryScoreboardDisplayId,
      selectedScoreboardDisplayIds: this.selectedScoreboardDisplayIds,
      selectedRingMatchOrderDisplayIds: this.selectedRingMatchOrderDisplayIds,
      scoreboardOutputMode: this.scoreboardOutputMode,
      scoreboardFullscreen: this.scoreboardFullscreenPreference,
    });
  }

  persistProfiles() {
    this.settingsStore.updateDisplaySettings({
      broadcastProfiles: this.broadcastProfiles,
    });
  }

  setOutputMode(mode) {
    const nextMode = mode === 'broadcast' ? 'broadcast' : 'single';
    this.scoreboardOutputMode = nextMode;
    this.selectedScoreboardDisplayIds = this.sanitizeSelectedDisplayIds(this.selectedScoreboardDisplayIds, nextMode);
    if (!this.preferredPrimaryScoreboardDisplayId && this.selectedScoreboardDisplayIds.length > 0) {
      this.preferredPrimaryScoreboardDisplayId = this.selectedScoreboardDisplayIds[0];
    }
    this.pruneRuntimeTracking();
    this.updateSessionStateFromOutputs();
    this.persistDisplayPreferences();
    this.statusNotice = this.createNotice(
      'info',
      nextMode === 'broadcast'
        ? 'Broadcast to Multiple Screens is ready.'
        : 'Single Screen mode is ready.'
    );
    return this.emitStateChange(`set-output-mode:${nextMode}`);
  }

  setSelectedDisplays(displayIds) {
    const normalizedIds = this.sanitizeSelectedDisplayIds(displayIds, this.scoreboardOutputMode);
    this.selectedScoreboardDisplayIds = normalizedIds;
    this.preferredPrimaryScoreboardDisplayId = normalizedIds[0] || this.preferredPrimaryScoreboardDisplayId;
    this.pruneRuntimeTracking();
    this.updateSessionStateFromOutputs();
    this.persistDisplayPreferences();
    return this.emitStateChange('set-selected-displays');
  }

  setSelectedDisplaysForRole(role, displayIds) {
    if (!isDisplayRole(role)) return this.emitStateChange('set-selected-displays-for-role:invalid-role');
    if (role === 'scoreboard') return this.setSelectedDisplays(displayIds);

    this.selectedRingMatchOrderDisplayIds = this.sanitizeSelectedDisplayIdsForRole(role, displayIds);
    this.pruneRuntimeTracking();
    this.updateSessionStateFromOutputs();
    this.persistDisplayPreferences();
    return this.emitStateChange(`set-selected-displays-for-role:${role}`);
  }

  addSelectedDisplay(displayId) {
    const normalizedId = normalizeDisplayId(displayId);
    if (!normalizedId) return this.emitStateChange('add-selected-display:invalid');

    const nextIds = this.scoreboardOutputMode === 'broadcast'
      ? [...this.selectedScoreboardDisplayIds, normalizedId]
      : [normalizedId];

    return this.setSelectedDisplays(nextIds);
  }

  removeSelectedDisplay(displayId) {
    const normalizedId = normalizeDisplayId(displayId);
    if (!normalizedId) return this.emitStateChange('remove-selected-display:invalid');
    return this.setSelectedDisplays(this.selectedScoreboardDisplayIds.filter((id) => id !== normalizedId));
  }

  selectAllExternalDisplays() {
    const externalIds = this.displayManager.getSecondaryDisplays().map((display) => normalizeDisplayId(display.id));
    this.scoreboardOutputMode = 'broadcast';
    this.selectedScoreboardDisplayIds = this.sanitizeSelectedDisplayIds(externalIds, 'broadcast');
    this.preferredPrimaryScoreboardDisplayId = this.selectedScoreboardDisplayIds[0] || this.preferredPrimaryScoreboardDisplayId;
    this.pruneRuntimeTracking();
    this.updateSessionStateFromOutputs();
    this.persistDisplayPreferences();
    this.statusNotice = this.createNotice(
      this.selectedScoreboardDisplayIds.length > 0 ? 'success' : 'warning',
      this.selectedScoreboardDisplayIds.length > 0
        ? 'All external screens were selected.'
        : 'No external screens are available to select.'
    );
    return this.emitStateChange('select-all-external-displays');
  }

  selectAllExternalDisplaysForRole(role) {
    if (!isDisplayRole(role)) return this.emitStateChange('select-all-external-for-role:invalid-role');
    if (role === 'scoreboard') return this.selectAllExternalDisplays();

    const externalIds = this.displayManager.getSecondaryDisplays().map((display) => normalizeDisplayId(display.id));
    this.selectedRingMatchOrderDisplayIds = this.sanitizeSelectedDisplayIdsForRole(role, externalIds);
    this.pruneRuntimeTracking();
    this.updateSessionStateFromOutputs();
    this.persistDisplayPreferences();
    this.statusNotice = this.createNotice(
      this.selectedRingMatchOrderDisplayIds.length > 0 ? 'success' : 'warning',
      this.selectedRingMatchOrderDisplayIds.length > 0
        ? 'All external Gilam Match Order screens were selected.'
        : 'No external screens are available to select.'
    );
    return this.emitStateChange(`select-all-external-for-role:${role}`);
  }

  clearSelectedDisplays() {
    this.selectedScoreboardDisplayIds = [];
    this.pruneRuntimeTracking();
    this.updateSessionStateFromOutputs();
    this.persistDisplayPreferences();
    this.statusNotice = this.createNotice('info', 'Screen selection cleared.');
    return this.emitStateChange('clear-selected-displays');
  }

  clearSelectedDisplaysForRole(role) {
    if (!isDisplayRole(role)) return this.emitStateChange('clear-selected-displays-for-role:invalid-role');
    if (role === 'scoreboard') return this.clearSelectedDisplays();

    this.selectedRingMatchOrderDisplayIds = [];
    this.pruneRuntimeTracking();
    this.updateSessionStateFromOutputs();
    this.persistDisplayPreferences();
    this.statusNotice = this.createNotice('info', 'Gilam Match Order screen selection cleared.');
    return this.emitStateChange(`clear-selected-displays-for-role:${role}`);
  }

  saveBroadcastProfile(name) {
    const trimmedName = typeof name === 'string' ? name.trim() : '';
    if (!trimmedName) {
      this.statusNotice = this.createNotice('warning', 'Enter a profile name first.');
      return this.emitStateChange('save-broadcast-profile-missing-name');
    }

    const selectedIds = this.sanitizeSelectedDisplayIds(this.selectedScoreboardDisplayIds, this.scoreboardOutputMode);
    const ringSelectedIds = this.sanitizeSelectedDisplayIdsForRole('ring_match_order', this.selectedRingMatchOrderDisplayIds);
    if (!selectedIds.length && !ringSelectedIds.length) {
      this.statusNotice = this.createNotice('warning', 'Choose at least one role screen before saving a setup.');
      return this.emitStateChange('save-broadcast-profile-missing-selection');
    }

    const buildDisplaySnapshots = (displayIds) => displayIds.map((displayId) => {
      const display = this.displayManager.getDisplayById(displayId);
      return {
        id: displayId,
        label: display?.label || this.knownDisplayLabels.get(displayId) || `Display ${displayId}`,
      };
    });
    const selectedDisplaySnapshots = buildDisplaySnapshots(selectedIds);
    const ringMatchOrderDisplaySnapshots = buildDisplaySnapshots(ringSelectedIds);
    const existingProfile = this.broadcastProfiles.find((profile) => profile.name.toLowerCase() === trimmedName.toLowerCase());
    const profilePayload = {
      id: existingProfile ? existingProfile.id : `profile_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
      name: trimmedName,
      scoreboardOutputMode: this.scoreboardOutputMode,
      selectedScoreboardDisplayIds: selectedIds,
      selectedRingMatchOrderDisplayIds: ringSelectedIds,
      selectedDisplayIdsByRole: {
        scoreboard: selectedIds,
        ring_match_order: ringSelectedIds,
      },
      selectedDisplaySnapshots,
      ringMatchOrderDisplaySnapshots,
      selectedDisplaySnapshotsByRole: {
        scoreboard: selectedDisplaySnapshots,
        ring_match_order: ringMatchOrderDisplaySnapshots,
      },
      preferredPrimaryScoreboardDisplayId: this.preferredPrimaryScoreboardDisplayId,
    };

    if (existingProfile) {
      this.broadcastProfiles = this.broadcastProfiles.map((profile) =>
        profile.id === existingProfile.id ? profilePayload : profile
      );
    } else {
      this.broadcastProfiles = [...this.broadcastProfiles, profilePayload];
    }

    this.persistProfiles();
    this.statusNotice = this.createNotice('success', `Saved profile "${trimmedName}".`);
    return this.emitStateChange('save-broadcast-profile');
  }

  applyBroadcastProfile(profileId) {
    const normalizedId = typeof profileId === 'string' ? profileId.trim() : '';
    const profile = this.broadcastProfiles.find((entry) => entry.id === normalizedId);
    if (!profile) {
      this.statusNotice = this.createNotice('warning', 'Selected profile is unavailable.');
      return this.emitStateChange('apply-broadcast-profile-missing');
    }

    this.scoreboardOutputMode = profile.scoreboardOutputMode === 'broadcast' ? 'broadcast' : 'single';
    this.selectedScoreboardDisplayIds = this.sanitizeSelectedDisplayIds(
      profile.selectedScoreboardDisplayIds,
      this.scoreboardOutputMode
    );
    this.selectedRingMatchOrderDisplayIds = this.sanitizeSelectedDisplayIdsForRole(
      'ring_match_order',
      profile.selectedRingMatchOrderDisplayIds
        ?? profile.selectedDisplayIdsByRole?.ring_match_order
        ?? []
    );
    this.preferredPrimaryScoreboardDisplayId = normalizeDisplayId(
      profile.preferredPrimaryScoreboardDisplayId || this.selectedScoreboardDisplayIds[0]
    );
    this.pruneRuntimeTracking();
    this.updateSessionStateFromOutputs();
    this.persistDisplayPreferences();
    this.statusNotice = this.createNotice('success', `Applied profile "${profile.name}".`);
    return this.emitStateChange('apply-broadcast-profile');
  }

  deleteBroadcastProfile(profileId) {
    const normalizedId = typeof profileId === 'string' ? profileId.trim() : '';
    const profile = this.broadcastProfiles.find((entry) => entry.id === normalizedId);
    if (!profile) {
      this.statusNotice = this.createNotice('warning', 'Selected profile is unavailable.');
      return this.emitStateChange('delete-broadcast-profile-missing');
    }

    this.broadcastProfiles = this.broadcastProfiles.filter((entry) => entry.id !== normalizedId);
    this.persistProfiles();
    this.statusNotice = this.createNotice('info', `Deleted profile "${profile.name}".`);
    return this.emitStateChange('delete-broadcast-profile');
  }

  reAddScoreboardDisplay(displayId) {
    const normalizedId = normalizeDisplayId(displayId);
    if (!normalizedId) {
      this.statusNotice = this.createNotice('warning', 'Choose a valid screen first.');
      return this.emitStateChange('readd-scoreboard-invalid');
    }

    if (!this.selectedScoreboardDisplayIds.includes(normalizedId)) {
      this.selectedScoreboardDisplayIds = this.sanitizeSelectedDisplayIds(
        [...this.selectedScoreboardDisplayIds, normalizedId],
        this.scoreboardOutputMode
      );
    }

    const targetDisplay = this.displayManager.getDisplayById(normalizedId);
    if (!targetDisplay) {
      this.removedDisplayIds.add(normalizedId);
      this.disconnectedDisplayIds.add(normalizedId);
      this.statusNotice = this.createNotice('warning', `${this.describeDisplay(normalizedId)} is not available yet.`);
      this.updateSessionStateFromOutputs();
      return this.emitStateChange('readd-scoreboard-missing-display');
    }

    this.releaseDisplaysFromOtherRoles('scoreboard', [normalizedId], {
      clearSelection: true,
      closeLive: true,
      closePreview: true,
    });

    if (this.scoreboardOutputMode === 'single') {
      return this.launchBroadcast({
        manual: false,
        outputMode: 'single',
        requestedDisplayIds: [normalizedId],
        preserveSelection: false,
        notice: { level: 'success', message: `Scoreboard returned to ${this.describeDisplay(normalizedId)}.` },
      });
    }

    const scoreboardWindow = this.ensureScoreboardWindowForDisplay(normalizedId);
    if (!scoreboardWindow || !this.applyScoreboardPlacement(normalizedId)) {
      this.failedDisplayErrors.set(normalizedId, 'Scoreboard window could not be re-added to the live broadcast.');
      this.updateSessionStateFromOutputs();
      this.statusNotice = this.createNotice('warning', `Unable to re-add ${this.describeDisplay(normalizedId)} right now.`);
      return this.emitStateChange('readd-scoreboard-failed');
    }

    this.failedDisplayErrors.delete(normalizedId);
    this.disconnectedDisplayIds.delete(normalizedId);
    this.removedDisplayIds.delete(normalizedId);
    this.persistDisplayPreferences();
    this.updateSessionStateFromOutputs();
    this.statusNotice = this.createNotice('success', `${this.describeDisplay(normalizedId)} rejoined the live broadcast.`);
    return this.emitStateChange('readd-scoreboard-success');
  }

  buildDisplayTestHtml(display, { index, total }) {
    const bounds = display && display.bounds ? display.bounds : { width: 0, height: 0 };
    const label = this.describeDisplay(display);
    const resolution = `${bounds.width} x ${bounds.height}`;
    const sequence = total > 1 ? `<div class="sequence">Selection ${index + 1} of ${total}</div>` : '';
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Scoreboard Display Test</title><style>:root{color-scheme:dark}*{box-sizing:border-box}html,body{width:100%;height:100%;margin:0;overflow:hidden;font-family:"Segoe UI",Arial,sans-serif;background:radial-gradient(circle at top,rgba(14,165,233,.3),transparent 48%),linear-gradient(135deg,#020617 0%,#081226 52%,#03111f 100%);color:#e0f2fe}body{display:flex;align-items:center;justify-content:center;padding:4vw}.frame{width:100%;height:100%;border:5px solid rgba(125,211,252,.9);border-radius:28px;display:flex;align-items:center;justify-content:center;position:relative;box-shadow:0 0 0 2px rgba(8,145,178,.45) inset,0 28px 90px rgba(2,6,23,.58);overflow:hidden}.frame:before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(90deg,rgba(125,211,252,.06) 0,rgba(125,211,252,.06) 2px,transparent 2px,transparent 24px);opacity:.35;pointer-events:none}.card{position:relative;width:min(92vw,980px);padding:48px 56px;border-radius:30px;border:1px solid rgba(186,230,253,.18);background:rgba(2,6,23,.75);backdrop-filter:blur(18px);box-shadow:0 24px 90px rgba(2,6,23,.45);text-align:center}.eyebrow{font-size:clamp(14px,1.4vw,24px);font-weight:800;letter-spacing:.52em;color:#7dd3fc;text-transform:uppercase;margin-bottom:18px}.headline{font-size:clamp(52px,7vw,128px);font-weight:900;letter-spacing:.08em;text-transform:uppercase;line-height:.94;color:#f8fafc;text-shadow:0 0 34px rgba(14,165,233,.4);margin:0}.subhead{margin-top:22px;font-size:clamp(24px,3vw,56px);font-weight:700;color:#bae6fd}.meta{margin-top:26px;font-size:clamp(16px,1.8vw,28px);font-weight:700;letter-spacing:.2em;color:rgba(224,242,254,.84);text-transform:uppercase}.sequence{margin-top:18px;font-size:clamp(14px,1.4vw,24px);font-weight:700;color:rgba(186,230,253,.82);text-transform:uppercase;letter-spacing:.22em}.footer{margin-top:34px;font-size:clamp(14px,1.3vw,22px);color:rgba(186,230,253,.72)}</style></head><body><div class="frame"><div class="card"><div class="eyebrow">Temporary Overlay</div><h1 class="headline">Scoreboard Test</h1><div class="subhead">${label}</div><div class="meta">${resolution}</div>${sequence}<div class="footer">If this is the correct display, return to the controller and confirm the live launch.</div></div></div></body></html>`;
  }

  applyScoreboardPlacement(displayId) {
    const normalizedId = normalizeDisplayId(displayId);
    const display = this.displayManager.getDisplayById(normalizedId);
    if (!display) return false;

    const scoreboardWindow = this.ensureScoreboardWindowForDisplay(normalizedId);
    if (!scoreboardWindow) return false;

    const controllerDisplay = this.getControllerDisplay();
    const controllerDisplayId = normalizeDisplayId(controllerDisplay && controllerDisplay.id);
    const shouldUseFullscreen = this.scoreboardFullscreenPreference && normalizedId !== controllerDisplayId;
    const bounds = shouldUseFullscreen ? cloneBounds(display.bounds) : this.getRecoverableBounds(display);
    const didApply = this.applyWindowBounds(scoreboardWindow, bounds, { alwaysOnTop: shouldUseFullscreen, show: true });
    if (!didApply) return false;

    this.scoreboardWindowModes.set(normalizedId, shouldUseFullscreen ? 'borderless-fullscreen' : 'recoverable-window');
    this.failedDisplayErrors.delete(normalizedId);
    this.disconnectedDisplayIds.delete(normalizedId);
    this.removedDisplayIds.delete(normalizedId);
    return true;
  }

  applyRingMatchOrderPlacement(displayId, options = {}) {
    const normalizedId = normalizeDisplayId(displayId);
    const display = this.displayManager.getDisplayById(normalizedId);
    if (!display) return false;

    const preview = options.preview === true;
    const targetWindow = preview
      ? this.ensureRingMatchOrderPreviewWindowForDisplay(normalizedId)
      : this.ensureRingMatchOrderWindowForDisplay(normalizedId);
    if (!targetWindow) return false;

    const controllerDisplay = this.getControllerDisplay();
    const controllerDisplayId = normalizeDisplayId(controllerDisplay && controllerDisplay.id);
    const shouldUseFullscreen = this.scoreboardFullscreenPreference && normalizedId !== controllerDisplayId;
    const bounds = shouldUseFullscreen ? cloneBounds(display.bounds) : this.getRecoverableBounds(display);
    const didApply = this.applyWindowBounds(targetWindow, bounds, { alwaysOnTop: shouldUseFullscreen, show: true });
    if (!didApply) return false;

    if (!preview) {
      this.ringMatchOrderWindowModes.set(normalizedId, shouldUseFullscreen ? 'borderless-fullscreen' : 'recoverable-window');
      this.ringMatchOrderFailedDisplayErrors.delete(normalizedId);
      this.ringMatchOrderDisconnectedDisplayIds.delete(normalizedId);
      this.ringMatchOrderRemovedDisplayIds.delete(normalizedId);
    }
    return true;
  }

  applyDisplayTestPlacement(displayId) {
    const normalizedId = normalizeDisplayId(displayId);
    const display = this.displayManager.getDisplayById(normalizedId);
    if (!display) return false;
    const testWindow = this.ensureDisplayTestWindowForDisplay(normalizedId);
    if (!testWindow) return false;
    return this.applyWindowBounds(testWindow, cloneBounds(display.bounds), { alwaysOnTop: true, show: true });
  }

  closeDisplayTestWindowForDisplay(displayId, options = {}) {
    const normalizedId = normalizeDisplayId(displayId);
    if (!normalizedId) return this.getState();
    const { silent = false, emit = true } = options;
    this.clearDisplayTestTimer(normalizedId);
    const win = this.displayTestWindows.get(normalizedId);
    if (win) {
      this.displayTestWindows.delete(normalizedId);
      win.removeAllListeners('closed');
      if (!win.isDestroyed()) win.close();
    }
    this.updateSessionStateFromOutputs();
    if (!emit) return this.getState();
    if (!silent) this.statusNotice = this.createNotice('info', `${this.describeDisplay(normalizedId)} test closed.`);
    return this.emitStateChange(`close-display-test:${normalizedId}`);
  }

  closeRingMatchOrderPreviewWindowForDisplay(displayId, options = {}) {
    const normalizedId = normalizeDisplayId(displayId);
    if (!normalizedId) return this.getState();
    const { silent = false, emit = true } = options;
    const win = this.ringMatchOrderPreviewWindows.get(normalizedId);
    if (win) {
      this.ringMatchOrderPreviewWindows.delete(normalizedId);
      win.removeAllListeners('closed');
      if (!win.isDestroyed()) win.close();
    }
    this.updateSessionStateFromOutputs();
    if (!emit) return this.getState();
    if (!silent) this.statusNotice = this.createNotice('info', `${this.describeDisplay(normalizedId)} preview closed.`);
    return this.emitStateChange(`close-ring-match-order-preview:${normalizedId}`);
  }

  closeAllRingMatchOrderPreviewWindows(options = {}) {
    const { silent = false, emit = true, reason = 'close-all-ring-match-order-previews' } = options;
    const previewIds = this.getPreviewRingMatchOrderDisplayIds();
    previewIds.forEach((displayId) => this.closeRingMatchOrderPreviewWindowForDisplay(displayId, { silent: true, emit: false }));
    this.updateSessionStateFromOutputs();
    if (!emit) return this.getState();
    if (!silent && previewIds.length > 0) {
      this.statusNotice = this.createNotice('success', 'Gilam Match Order preview completed.');
    }
    return this.emitStateChange(reason);
  }

  closeAllDisplayTestWindows(options = {}) {
    const { silent = false, emit = true, reason = 'close-all-display-tests' } = options;
    const previewIds = this.getPreviewDisplayIds();
    previewIds.forEach((displayId) => this.closeDisplayTestWindowForDisplay(displayId, { silent: true, emit: false }));
    this.updateSessionStateFromOutputs();
    if (!emit) return this.getState();
    if (!silent && previewIds.length > 0) {
      this.statusNotice = this.createNotice('success', 'Screen test completed.');
    }
    return this.emitStateChange(reason);
  }

  destroyScoreboardWindowForDisplay(displayId, options = {}) {
    const normalizedId = normalizeDisplayId(displayId);
    if (!normalizedId) return;
    const win = this.scoreboardWindows.get(normalizedId);
    this.scoreboardWindows.delete(normalizedId);
    this.scoreboardWindowModes.delete(normalizedId);
    if (win) {
      win.removeAllListeners('closed');
      if (!win.isDestroyed()) win.close();
    }
    if (options.clearFailures) {
      this.failedDisplayErrors.delete(normalizedId);
      this.disconnectedDisplayIds.delete(normalizedId);
      this.removedDisplayIds.delete(normalizedId);
    }
  }

  destroyAllScoreboardWindows(options = {}) {
    Array.from(this.scoreboardWindows.keys()).forEach((displayId) => this.destroyScoreboardWindowForDisplay(displayId, options));
  }

  destroyRingMatchOrderWindowForDisplay(displayId, options = {}) {
    const normalizedId = normalizeDisplayId(displayId);
    if (!normalizedId) return;
    const win = this.ringMatchOrderWindows.get(normalizedId);
    this.ringMatchOrderWindows.delete(normalizedId);
    this.ringMatchOrderWindowModes.delete(normalizedId);
    if (win) {
      win.removeAllListeners('closed');
      if (!win.isDestroyed()) win.close();
    }
    if (options.clearFailures) {
      this.ringMatchOrderFailedDisplayErrors.delete(normalizedId);
      this.ringMatchOrderDisconnectedDisplayIds.delete(normalizedId);
      this.ringMatchOrderRemovedDisplayIds.delete(normalizedId);
    }
  }

  destroyAllRingMatchOrderWindows(options = {}) {
    Array.from(this.ringMatchOrderWindows.keys()).forEach((displayId) => this.destroyRingMatchOrderWindowForDisplay(displayId, options));
  }

  testSelectedDisplays(options = {}) {
    if (this.isScoreboardLaunched()) {
      this.statusNotice = this.createNotice('warning', 'Stop the live scoreboard before testing selected screens.');
      return this.emitStateChange('test-selected-displays-live');
    }

    const durationMs = typeof options.durationMs === 'number' ? options.durationMs : 2200;
    const targetDisplays = this.getAvailableSelectedDisplays(options.displayIds);
    const missingIds = this.getMissingSelectedDisplayIds(options.displayIds);
    if (!targetDisplays.length) {
      this.statusNotice = this.createNotice('warning', 'Choose at least one available scoreboard screen first.');
      return this.emitStateChange('test-selected-displays-missing-target');
    }

    const occupiedIds = targetDisplays
      .map((display) => normalizeDisplayId(display.id))
      .filter((displayId) => this.getRoleOccupancy(displayId).liveRoles.includes('ring_match_order'));
    if (occupiedIds.length > 0) {
      this.statusNotice = this.createNotice(
        'warning',
        'Stop the live Gilam Match Order output before testing those same screens.'
      );
      return this.emitStateChange('test-selected-displays-ring-occupied');
    }

    this.closeAllDisplayTestWindows({ silent: true, emit: false });

    const successfulIds = [];
    const failedIds = [];

    targetDisplays.forEach((display, index) => {
      const displayId = normalizeDisplayId(display.id);
      const testWindow = this.ensureDisplayTestWindowForDisplay(displayId);
      if (!testWindow) {
        failedIds.push(displayId);
        this.failedDisplayErrors.set(displayId, 'Display test window could not be created.');
        return;
      }

      testWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(this.buildDisplayTestHtml(display, {
        index,
        total: targetDisplays.length,
      }))}`);

      if (!this.applyDisplayTestPlacement(displayId)) {
        failedIds.push(displayId);
        this.failedDisplayErrors.set(displayId, 'Display test window could not be positioned on the selected screen.');
        this.closeDisplayTestWindowForDisplay(displayId, { silent: true, emit: false });
        return;
      }

      successfulIds.push(displayId);
      this.failedDisplayErrors.delete(displayId);
      this.clearDisplayTestTimer(displayId);
      this.displayTestTimers.set(displayId, setTimeout(() => {
        this.closeDisplayTestWindowForDisplay(displayId, { silent: true, emit: false });
        if (!this.isDisplayTestActive()) {
          this.updateSessionStateFromOutputs();
          this.statusNotice = this.createNotice('success', 'Selected screen test completed successfully.');
          this.emitStateChange(`display-test-finished:${displayId}`);
        }
      }, durationMs));
    });

    missingIds.forEach((displayId) => this.removedDisplayIds.add(displayId));
    this.updateSessionStateFromOutputs();

    if (!successfulIds.length) {
      this.statusNotice = this.createNotice('warning', 'Selected screen test could not start on any target screens.');
      return this.emitStateChange('test-selected-displays-failed');
    }

    if (failedIds.length || missingIds.length) {
      this.statusNotice = this.createNotice(
        'warning',
        `Testing ${successfulIds.length} screen(s). ${failedIds.length + missingIds.length} target(s) are unavailable.`
      );
    } else {
      this.statusNotice = this.createNotice(
        'info',
        `Testing ${successfulIds.length} selected screen${successfulIds.length === 1 ? '' : 's'}.`
      );
    }

    return this.emitStateChange('test-selected-displays');
  }

  showDisplayTestOnDisplay(displayId, options = {}) {
    const normalizedId = normalizeDisplayId(displayId);
    return this.testSelectedDisplays({
      ...options,
      displayIds: normalizedId ? [normalizedId] : [],
    });
  }

  testRoleDisplays(role, options = {}) {
    if (!isDisplayRole(role)) {
      this.statusNotice = this.createNotice('warning', 'Choose a valid display role first.');
      return this.emitStateChange('test-role-displays-invalid-role');
    }

    if (role === 'scoreboard') {
      return this.testSelectedDisplays(options);
    }

    if (this.isRingMatchOrderLaunched()) {
      this.statusNotice = this.createNotice('warning', 'Stop the live Gilam Match Order screens before previewing selected screens.');
      return this.emitStateChange('test-role-displays-ring-live');
    }

    const targetDisplays = this.getAvailableSelectedDisplaysForRole(role, options.displayIds);
    const missingIds = this.getMissingSelectedDisplayIdsForRole(role, options.displayIds);
    if (!targetDisplays.length) {
      this.statusNotice = this.createNotice('warning', 'Choose at least one available Gilam Match Order screen first.');
      return this.emitStateChange('test-role-displays-ring-missing-target');
    }

    const occupiedIds = targetDisplays
      .map((display) => normalizeDisplayId(display.id))
      .filter((displayId) => this.getRoleOccupancy(displayId).liveRoles.some((entry) => entry !== role));
    if (occupiedIds.length > 0) {
      this.statusNotice = this.createNotice(
        'warning',
        'Preview is only available on screens that are not currently live for another role.'
      );
      return this.emitStateChange('test-role-displays-ring-occupied');
    }

    this.closeAllRingMatchOrderPreviewWindows({ silent: true, emit: false });

    const successfulIds = [];
    const failedIds = [];
    targetDisplays.forEach((display) => {
      const displayId = normalizeDisplayId(display.id);
      const previewWindow = this.ensureRingMatchOrderPreviewWindowForDisplay(displayId);
      if (!previewWindow || !this.applyRingMatchOrderPlacement(displayId, { preview: true })) {
        failedIds.push(displayId);
        this.ringMatchOrderFailedDisplayErrors.set(displayId, 'Gilam Match Order preview could not be opened on the selected screen.');
        return;
      }

      successfulIds.push(displayId);
      this.ringMatchOrderFailedDisplayErrors.delete(displayId);
      this.ringMatchOrderDisconnectedDisplayIds.delete(displayId);
      this.ringMatchOrderRemovedDisplayIds.delete(displayId);
    });

    missingIds.forEach((displayId) => this.ringMatchOrderRemovedDisplayIds.add(displayId));
    this.updateSessionStateFromOutputs();

    if (!successfulIds.length) {
      this.statusNotice = this.createNotice('warning', 'Gilam Match Order preview could not start on any selected screens.');
      return this.emitStateChange('test-role-displays-ring-failed');
    }

    if (failedIds.length || missingIds.length) {
      this.statusNotice = this.createNotice(
        'warning',
        `Previewing Gilam Match Order on ${successfulIds.length} screen(s). ${failedIds.length + missingIds.length} target(s) are unavailable.`
      );
    } else {
      this.statusNotice = this.createNotice('info', `Previewing Gilam Match Order on ${successfulIds.length} selected screen${successfulIds.length === 1 ? '' : 's'}.`);
    }

    return this.emitStateChange(`test-role-displays:${role}`);
  }

  launchBroadcast(options = {}) {
    const manual = options.manual !== false;
    const preserveSelection = options.preserveSelection === true;
    const outputMode = options.outputMode
      ? (options.outputMode === 'broadcast' ? 'broadcast' : 'single')
      : this.scoreboardOutputMode;
    const requestedDisplayIds = this.getLaunchTargetIds(options.requestedDisplayIds, outputMode);

    if (!requestedDisplayIds.length) {
      this.statusNotice = this.createNotice('warning', 'Choose at least one scoreboard screen before launch.');
      return this.emitStateChange('launch-broadcast-missing-selection');
    }

    const targetDisplays = requestedDisplayIds
      .map((displayId) => this.displayManager.getDisplayById(displayId))
      .filter(Boolean);
    const missingIds = requestedDisplayIds.filter((displayId) => !this.displayManager.getDisplayById(displayId));

    if (!targetDisplays.length) {
      this.statusNotice = this.createNotice('warning', 'Selected screens are unavailable. Re-scan and choose available targets.');
      return this.emitStateChange('launch-broadcast-no-available-targets');
    }

    this.releaseDisplaysFromOtherRoles('scoreboard', requestedDisplayIds, {
      clearSelection: true,
      closeLive: true,
      closePreview: true,
    });

    if (!preserveSelection) {
      this.scoreboardOutputMode = outputMode;
      this.selectedScoreboardDisplayIds = this.sanitizeSelectedDisplayIds(requestedDisplayIds, outputMode);
      this.preferredPrimaryScoreboardDisplayId = this.selectedScoreboardDisplayIds[0] || this.preferredPrimaryScoreboardDisplayId;
      if (manual) this.persistDisplayPreferences();
    }

    this.closeAllDisplayTestWindows({ silent: true, emit: false });

    const targetIds = targetDisplays.map((display) => normalizeDisplayId(display.id));
    Array.from(this.scoreboardWindows.keys()).forEach((displayId) => {
      if (!targetIds.includes(displayId)) {
        this.destroyScoreboardWindowForDisplay(displayId, { silent: true });
      }
    });

    const successfulIds = [];
    const failedIds = [];

    targetDisplays.forEach((display) => {
      const displayId = normalizeDisplayId(display.id);
      const scoreboardWindow = this.ensureScoreboardWindowForDisplay(displayId);
      if (!scoreboardWindow || !this.applyScoreboardPlacement(displayId)) {
        failedIds.push(displayId);
        this.failedDisplayErrors.set(displayId, 'Scoreboard window could not be created on the selected screen.');
        return;
      }
      successfulIds.push(displayId);
    });

    missingIds.forEach((displayId) => {
      this.removedDisplayIds.add(displayId);
      this.disconnectedDisplayIds.add(displayId);
    });

    this.pruneRuntimeTracking();
    this.updateSessionStateFromOutputs();
    this.persistDisplayPreferences();

    if (!successfulIds.length) {
      this.updateSessionStateFromOutputs({ stoppedScoreboard: true });
      this.statusNotice = this.createNotice('warning', 'Broadcast could not start on any selected screens.');
      return this.emitStateChange('launch-broadcast-failed');
    }

    if (options.notice) {
      this.statusNotice = this.createNotice(options.notice.level || 'info', options.notice.message);
    } else if (failedIds.length || missingIds.length) {
      this.statusNotice = this.createNotice(
        'warning',
        `Broadcast live with ${successfulIds.length}/${requestedDisplayIds.length} screen${requestedDisplayIds.length === 1 ? '' : 's'} active.`
      );
    } else if (successfulIds.length === 1) {
      this.statusNotice = this.createNotice('success', `Scoreboard launched on ${this.describeDisplay(successfulIds[0])}.`);
    } else {
      this.statusNotice = this.createNotice('success', `Broadcast live on ${successfulIds.length} screens.`);
    }

    return this.emitStateChange('launch-broadcast');
  }

  stopBroadcast(options = {}) {
    const { silent = false, notice = null } = options;
    const hadLiveOutputs = this.isScoreboardLaunched();
    const hadTests = this.isDisplayTestActive();

    this.closeAllDisplayTestWindows({ silent: true, emit: false });
    this.destroyAllScoreboardWindows({ clearFailures: true });
    this.pruneRuntimeTracking();
    this.updateSessionStateFromOutputs({ stoppedScoreboard: true });

    if (notice) {
      this.statusNotice = this.createNotice(notice.level || 'info', notice.message);
    } else if (!silent && (hadLiveOutputs || hadTests)) {
      this.statusNotice = this.createNotice('info', 'Broadcast stopped. Selected screens remain saved for the next launch.');
    } else if (!silent) {
      this.statusNotice = this.createNotice('info', 'Broadcast is already stopped.');
    }

    return this.emitStateChange('stop-broadcast');
  }

  launchRoleDisplays(role, options = {}) {
    if (!isDisplayRole(role)) {
      this.statusNotice = this.createNotice('warning', 'Choose a valid display role first.');
      return this.emitStateChange('launch-role-displays-invalid-role');
    }

    if (role === 'scoreboard') {
      return this.launchBroadcast(options);
    }

    const requestedDisplayIds = this.getLaunchTargetIdsForRole(role, options.requestedDisplayIds);
    if (!requestedDisplayIds.length) {
      this.statusNotice = this.createNotice('warning', 'Choose at least one Gilam Match Order screen before launch.');
      return this.emitStateChange('launch-role-displays-ring-missing-selection');
    }

    const targetDisplays = requestedDisplayIds
      .map((displayId) => this.displayManager.getDisplayById(displayId))
      .filter(Boolean);
    const missingIds = requestedDisplayIds.filter((displayId) => !this.displayManager.getDisplayById(displayId));
    if (!targetDisplays.length) {
      this.statusNotice = this.createNotice('warning', 'Selected Gilam Match Order screens are unavailable. Re-scan and choose available targets.');
      return this.emitStateChange('launch-role-displays-ring-no-available-targets');
    }

    this.releaseDisplaysFromOtherRoles(role, requestedDisplayIds, {
      clearSelection: true,
      closeLive: true,
      closePreview: true,
    });
    this.closeAllRingMatchOrderPreviewWindows({ silent: true, emit: false });

    const targetIds = targetDisplays.map((display) => normalizeDisplayId(display.id));
    Array.from(this.ringMatchOrderWindows.keys()).forEach((displayId) => {
      if (!targetIds.includes(displayId)) {
        this.destroyRingMatchOrderWindowForDisplay(displayId, { silent: true });
      }
    });

    const successfulIds = [];
    const failedIds = [];
    targetDisplays.forEach((display) => {
      const displayId = normalizeDisplayId(display.id);
      const ringWindow = this.ensureRingMatchOrderWindowForDisplay(displayId);
      if (!ringWindow || !this.applyRingMatchOrderPlacement(displayId)) {
        failedIds.push(displayId);
        this.ringMatchOrderFailedDisplayErrors.set(displayId, 'Gilam Match Order window could not be created on the selected screen.');
        return;
      }
      successfulIds.push(displayId);
    });

    missingIds.forEach((displayId) => {
      this.ringMatchOrderRemovedDisplayIds.add(displayId);
      this.ringMatchOrderDisconnectedDisplayIds.add(displayId);
    });

    this.pruneRuntimeTracking();
    this.updateSessionStateFromOutputs();
    this.persistDisplayPreferences();

    if (!successfulIds.length) {
      this.ringMatchOrderSessionState = 'stopped';
      this.statusNotice = this.createNotice('warning', 'Gilam Match Order could not start on any selected screens.');
      return this.emitStateChange('launch-role-displays-ring-failed');
    }

    if (failedIds.length || missingIds.length) {
      this.statusNotice = this.createNotice(
        'warning',
        `Gilam Match Order live with ${successfulIds.length}/${requestedDisplayIds.length} screen${requestedDisplayIds.length === 1 ? '' : 's'} active.`
      );
    } else if (successfulIds.length === 1) {
      this.statusNotice = this.createNotice('success', `Gilam Match Order launched on ${this.describeDisplay(successfulIds[0])}.`);
    } else {
      this.statusNotice = this.createNotice('success', `Gilam Match Order live on ${successfulIds.length} screens.`);
    }

    return this.emitStateChange(`launch-role-displays:${role}`);
  }

  stopRoleDisplays(role, options = {}) {
    if (!isDisplayRole(role)) {
      this.statusNotice = this.createNotice('warning', 'Choose a valid display role first.');
      return this.emitStateChange('stop-role-displays-invalid-role');
    }

    if (role === 'scoreboard') {
      return this.stopBroadcast(options);
    }

    const { silent = false, notice = null } = options;
    const hadLiveOutputs = this.isRingMatchOrderLaunched();
    const hadPreviews = this.isRingMatchOrderPreviewActive();

    this.closeAllRingMatchOrderPreviewWindows({ silent: true, emit: false });
    this.destroyAllRingMatchOrderWindows({ clearFailures: true });
    this.pruneRuntimeTracking();
    this.updateSessionStateFromOutputs();
    this.ringMatchOrderSessionState = 'stopped';

    if (notice) {
      this.statusNotice = this.createNotice(notice.level || 'info', notice.message);
    } else if (!silent && (hadLiveOutputs || hadPreviews)) {
      this.statusNotice = this.createNotice('info', 'Gilam Match Order stopped. Selected screens remain saved for the next launch.');
    } else if (!silent) {
      this.statusNotice = this.createNotice('info', 'Gilam Match Order is already stopped.');
    }

    return this.emitStateChange(`stop-role-displays:${role}`);
  }

  moveRoleToDisplay(role, displayId, options = {}) {
    if (!isDisplayRole(role)) {
      this.statusNotice = this.createNotice('warning', 'Choose a valid display role first.');
      return this.emitStateChange('move-role-to-display-invalid-role');
    }

    if (role === 'scoreboard') {
      return this.moveScoreboardToDisplay(displayId, options);
    }

    if (!this.isRingMatchOrderLaunched()) {
      this.statusNotice = this.createNotice('warning', 'Launch Gilam Match Order before moving it.');
      return this.emitStateChange('move-role-to-display-ring-inactive');
    }

    const normalizedId = normalizeDisplayId(displayId);
    return this.launchRoleDisplays(role, {
      ...options,
      requestedDisplayIds: normalizedId ? [normalizedId] : [],
    });
  }

  reAddRoleDisplay(role, displayId) {
    if (!isDisplayRole(role)) {
      this.statusNotice = this.createNotice('warning', 'Choose a valid display role first.');
      return this.emitStateChange('readd-role-display-invalid-role');
    }

    if (role === 'scoreboard') {
      return this.reAddScoreboardDisplay(displayId);
    }

    const normalizedId = normalizeDisplayId(displayId);
    if (!normalizedId) {
      this.statusNotice = this.createNotice('warning', 'Choose a valid screen first.');
      return this.emitStateChange('readd-role-display-ring-invalid');
    }

    if (!this.selectedRingMatchOrderDisplayIds.includes(normalizedId)) {
      this.selectedRingMatchOrderDisplayIds = this.sanitizeSelectedDisplayIdsForRole(
        role,
        [...this.selectedRingMatchOrderDisplayIds, normalizedId]
      );
    }

    const targetDisplay = this.displayManager.getDisplayById(normalizedId);
    if (!targetDisplay) {
      this.ringMatchOrderRemovedDisplayIds.add(normalizedId);
      this.ringMatchOrderDisconnectedDisplayIds.add(normalizedId);
      this.statusNotice = this.createNotice('warning', `${this.describeDisplay(normalizedId)} is not available yet.`);
      this.updateSessionStateFromOutputs();
      return this.emitStateChange('readd-role-display-ring-missing-display');
    }

    this.releaseDisplaysFromOtherRoles(role, [normalizedId], {
      clearSelection: true,
      closeLive: true,
      closePreview: true,
    });

    const ringWindow = this.ensureRingMatchOrderWindowForDisplay(normalizedId);
    if (!ringWindow || !this.applyRingMatchOrderPlacement(normalizedId)) {
      this.ringMatchOrderFailedDisplayErrors.set(normalizedId, 'Gilam Match Order window could not be re-added to the live output.');
      this.updateSessionStateFromOutputs();
      this.statusNotice = this.createNotice('warning', `Unable to re-add ${this.describeDisplay(normalizedId)} right now.`);
      return this.emitStateChange('readd-role-display-ring-failed');
    }

    this.ringMatchOrderFailedDisplayErrors.delete(normalizedId);
    this.ringMatchOrderDisconnectedDisplayIds.delete(normalizedId);
    this.ringMatchOrderRemovedDisplayIds.delete(normalizedId);
    this.persistDisplayPreferences();
    this.updateSessionStateFromOutputs();
    this.statusNotice = this.createNotice('success', `${this.describeDisplay(normalizedId)} rejoined Gilam Match Order.`);
    return this.emitStateChange(`readd-role-display:${role}`);
  }

  launchScoreboardOnDisplay(displayId, options = {}) {
    const normalizedId = normalizeDisplayId(displayId);
    return this.launchBroadcast({
      ...options,
      outputMode: 'single',
      requestedDisplayIds: normalizedId ? [normalizedId] : [],
    });
  }

  moveScoreboardToDisplay(displayId, options = {}) {
    if (!this.isScoreboardLaunched()) {
      this.statusNotice = this.createNotice('warning', 'Launch the scoreboard before moving it.');
      return this.emitStateChange('move-scoreboard-inactive');
    }

    const normalizedId = normalizeDisplayId(displayId);
    return this.launchBroadcast({
      ...options,
      outputMode: 'single',
      requestedDisplayIds: normalizedId ? [normalizedId] : [],
      notice: options.notice || { level: 'success', message: `Scoreboard moved to ${this.describeDisplay(normalizedId)}.` },
    });
  }

  moveScoreboardToPrimary(options = {}) {
    if (!this.isScoreboardLaunched()) {
      this.statusNotice = this.createNotice('warning', 'Launch the scoreboard before returning it to the main display.');
      return this.emitStateChange('move-scoreboard-primary-inactive');
    }

    const primaryDisplay = this.displayManager.getPrimaryDisplay();
    if (!primaryDisplay) {
      this.statusNotice = this.createNotice('warning', 'Main display is unavailable.');
      return this.emitStateChange('move-scoreboard-primary-missing');
    }

    return this.launchBroadcast({
      ...options,
      outputMode: 'single',
      requestedDisplayIds: [primaryDisplay.id],
      preserveSelection: options.manual === false,
      notice: options.notice || {
        level: 'info',
        message: 'Scoreboard brought to the main display in recoverable mode.',
      },
    });
  }

  closeScoreboard(options = {}) {
    return this.stopBroadcast(options);
  }

  moveControllerToDisplay(displayId) {
    const targetDisplay = this.displayManager.getDisplayById(displayId);
    if (!targetDisplay) {
      this.statusNotice = this.createNotice('warning', 'Selected controller screen is unavailable.');
      return this.emitStateChange('move-controller-missing-target');
    }

    if (!this.applyControllerPlacement(targetDisplay)) {
      this.statusNotice = this.createNotice('warning', 'Controller window is unavailable. Restart the app and try again.');
      return this.emitStateChange('move-controller-missing-window');
    }

    this.getLiveScoreboardDisplayIds().forEach((outputDisplayId) => {
      this.applyScoreboardPlacement(outputDisplayId);
    });
    this.getLiveRingMatchOrderDisplayIds().forEach((outputDisplayId) => {
      this.applyRingMatchOrderPlacement(outputDisplayId);
    });
    this.getPreviewRingMatchOrderDisplayIds().forEach((outputDisplayId) => {
      this.applyRingMatchOrderPlacement(outputDisplayId, { preview: true });
    });

    return this.emitStateChange(`move-controller:${normalizeDisplayId(targetDisplay.id)}`);
  }

  toggleScoreboardFullscreen(force) {
    this.scoreboardFullscreenPreference = typeof force === 'boolean' ? force : !this.scoreboardFullscreenPreference;
    this.persistDisplayPreferences();

    if (!this.isScoreboardLaunched()) {
      this.statusNotice = this.createNotice(
        'info',
        this.scoreboardFullscreenPreference
          ? 'Scoreboard presentation mode will apply the next time you launch it.'
          : 'Scoreboard recoverable window mode will apply the next time you launch it.'
      );
      return this.emitStateChange(`toggle-scoreboard-fullscreen:${this.scoreboardFullscreenPreference}`);
    }

    const failedIds = [];
    this.getLiveScoreboardDisplayIds().forEach((displayId) => {
      if (!this.applyScoreboardPlacement(displayId)) {
        failedIds.push(displayId);
        this.failedDisplayErrors.set(displayId, 'Scoreboard could not be re-positioned after changing display mode.');
      }
    });
    this.getLiveRingMatchOrderDisplayIds().forEach((displayId) => {
      if (!this.applyRingMatchOrderPlacement(displayId)) {
        failedIds.push(displayId);
        this.ringMatchOrderFailedDisplayErrors.set(displayId, 'Gilam Match Order could not be re-positioned after changing display mode.');
      }
    });

    this.updateSessionStateFromOutputs();
    this.statusNotice = this.createNotice(
      failedIds.length > 0 ? 'warning' : 'info',
      this.scoreboardFullscreenPreference
        ? 'Scoreboard presentation mode enabled.'
        : 'Scoreboard recoverable window mode enabled.'
    );
    return this.emitStateChange(`toggle-scoreboard-fullscreen:${this.scoreboardFullscreenPreference}`);
  }

  swapWindowsBetweenDisplays() {
    const liveIds = this.getLiveScoreboardDisplayIds();
    if (!liveIds.length) {
      this.statusNotice = this.createNotice('warning', 'Launch the scoreboard before swapping displays.');
      return this.emitStateChange('swap-displays-inactive');
    }

    if (liveIds.length > 1) {
      this.statusNotice = this.createNotice('warning', 'Swap is only available in Single Screen mode.');
      return this.emitStateChange('swap-displays-broadcast-unsupported');
    }

    const controllerDisplay = this.getControllerDisplay();
    const scoreboardDisplayId = liveIds[0];
    const scoreboardDisplay = this.displayManager.getDisplayById(scoreboardDisplayId);
    if (!controllerDisplay || !scoreboardDisplay) {
      this.statusNotice = this.createNotice('warning', 'Swap requires both controller and scoreboard displays to be available.');
      return this.emitStateChange('swap-displays-missing-display');
    }

    const controllerDisplayId = normalizeDisplayId(controllerDisplay.id);
    if (!this.applyControllerPlacement(scoreboardDisplay)) {
      this.statusNotice = this.createNotice('warning', 'Controller window is unavailable. Restart the app and try again.');
      return this.emitStateChange('swap-displays-controller-failed');
    }

    return this.launchBroadcast({
      manual: true,
      outputMode: 'single',
      requestedDisplayIds: [controllerDisplayId],
      notice: { level: 'success', message: 'Controller and scoreboard displays were swapped.' },
    });
  }

  reconcileDisplays(options = {}) {
    const { reason = 'display-reconcile', notice = null, clearNotice = false } = options;
    const topologyChange = this.detectDisplayTopologyChange();
    const primaryDisplay = this.displayManager.getPrimaryDisplay();

    if (!this.applyControllerPlacement(primaryDisplay)) {
      this.statusNotice = this.createNotice('warning', 'Controller window is unavailable. Restart the app and try again.');
      return this.emitStateChange('display-reconcile-controller-missing-window');
    }

    topologyChange.addedIds.forEach((displayId) => {
      this.removedDisplayIds.delete(displayId);
      this.disconnectedDisplayIds.delete(displayId);
      this.failedDisplayErrors.delete(displayId);
    });

    topologyChange.removedIds.forEach((displayId) => {
      if (this.scoreboardWindows.has(displayId)) {
        this.destroyScoreboardWindowForDisplay(displayId, { silent: true });
      }
      if (this.ringMatchOrderWindows.has(displayId)) {
        this.destroyRingMatchOrderWindowForDisplay(displayId, { silent: true });
      }
      if (this.ringMatchOrderPreviewWindows.has(displayId)) {
        this.closeRingMatchOrderPreviewWindowForDisplay(displayId, { silent: true, emit: false });
      }
      this.removedDisplayIds.add(displayId);
      this.disconnectedDisplayIds.add(displayId);
      this.ringMatchOrderRemovedDisplayIds.add(displayId);
      this.ringMatchOrderDisconnectedDisplayIds.add(displayId);
    });

    this.getPreviewDisplayIds().forEach((displayId) => {
      if (!this.displayManager.getDisplayById(displayId)) {
        this.closeDisplayTestWindowForDisplay(displayId, { silent: true, emit: false });
      } else {
        this.applyDisplayTestPlacement(displayId);
      }
    });
    this.getPreviewRingMatchOrderDisplayIds().forEach((displayId) => {
      if (!this.displayManager.getDisplayById(displayId)) {
        this.closeRingMatchOrderPreviewWindowForDisplay(displayId, { silent: true, emit: false });
      } else {
        this.applyRingMatchOrderPlacement(displayId, { preview: true });
      }
    });

    this.getLiveScoreboardDisplayIds().forEach((displayId) => {
      if (!this.displayManager.getDisplayById(displayId)) {
        this.destroyScoreboardWindowForDisplay(displayId, { silent: true });
        this.removedDisplayIds.add(displayId);
        this.disconnectedDisplayIds.add(displayId);
        return;
      }
      this.applyScoreboardPlacement(displayId);
    });
    this.getLiveRingMatchOrderDisplayIds().forEach((displayId) => {
      if (!this.displayManager.getDisplayById(displayId)) {
        this.destroyRingMatchOrderWindowForDisplay(displayId, { silent: true });
        this.ringMatchOrderRemovedDisplayIds.add(displayId);
        this.ringMatchOrderDisconnectedDisplayIds.add(displayId);
        return;
      }
      this.applyRingMatchOrderPlacement(displayId);
    });

    this.pruneRuntimeTracking();
    this.updateSessionStateFromOutputs();

    if (clearNotice) {
      this.statusNotice = null;
    } else if (notice) {
      this.statusNotice = this.createNotice(notice.level || 'info', notice.message);
    } else if (topologyChange.primaryChanged && primaryDisplay) {
      this.statusNotice = this.createNotice('info', `Main display changed. Controller moved to ${this.describeDisplay(primaryDisplay)}.`);
    }

    return this.emitStateChange(reason);
  }

  rescanDisplays() {
    return this.reconcileDisplays({
      reason: 'manual-rescan',
      notice: { level: 'info', message: 'Screens re-scanned.' },
    });
  }

  describeDisplay(displayOrId) {
    const displayId = typeof displayOrId === 'object'
      ? normalizeDisplayId(displayOrId && displayOrId.id)
      : normalizeDisplayId(displayOrId);
    if (!displayId) return 'Unknown display';
    const displays = this.displayManager.getAllDisplays(this.preferredPrimaryScoreboardDisplayId);
    const match = displays.find((display) => display.id === displayId);
    return match ? match.label : (this.knownDisplayLabels.get(displayId) || `Display ${displayId}`);
  }

  getDisplayStatusById() {
    return this.getDisplayStatusByIdForRole('scoreboard');
  }

  getDisplayStatusByIdForRole(role) {
    const liveIds = new Set(role === 'ring_match_order' ? this.getLiveRingMatchOrderDisplayIds() : this.getLiveScoreboardDisplayIds());
    const previewIds = new Set(role === 'ring_match_order' ? this.getPreviewRingMatchOrderDisplayIds() : this.getPreviewDisplayIds());
    const selectedIds = new Set(this.getSelectedDisplayIdsForRole(role));
    const failedErrors = this.getFailedDisplayErrorsForRole(role);
    const disconnectedIds = this.getDisconnectedDisplayIdsForRole(role);
    const removedIds = this.getRemovedDisplayIdsForRole(role);
    const windowModes = this.getWindowModesForRole(role);
    const statuses = {};

    this.displayManager.getAllDisplays(this.preferredPrimaryScoreboardDisplayId).forEach((display) => {
      const displayId = normalizeDisplayId(display.id);
      const mode = windowModes.get(displayId) || 'hidden';
      let state = 'available';
      if (previewIds.has(displayId)) state = 'testing';
      else if (liveIds.has(displayId)) state = 'live';
      else if (failedErrors.has(displayId)) state = 'failed';
      else if (disconnectedIds.has(displayId)) state = 'disconnected';
      else if (selectedIds.has(displayId)) state = 'selected';

      statuses[displayId] = {
        state,
        selected: selectedIds.has(displayId),
        live: liveIds.has(displayId),
        testing: previewIds.has(displayId),
        disconnected: disconnectedIds.has(displayId),
        failed: failedErrors.has(displayId),
        removed: removedIds.has(displayId),
        mode,
        lastError: failedErrors.get(displayId) || null,
      };
    });

    return statuses;
  }

  getState() {
    this.rememberKnownDisplayLabels();
    const controllerDisplay = this.getControllerDisplay();
    const scoreboardDisplay = this.getScoreboardDisplay();
    const previewDisplay = this.getPreviewDisplay();
    const liveScoreboardDisplayIds = this.getLiveScoreboardDisplayIds();
    const previewDisplayIds = this.getPreviewDisplayIds();
    const missingSelectedDisplayIds = this.getMissingSelectedDisplayIds();
    const pendingSelectedDisplayIds = this.getPendingSelectedDisplayIds();
    const failedCount = this.failedDisplayErrors.size;
    const disconnectedCount = this.disconnectedDisplayIds.size;
    const liveRingMatchOrderDisplayIds = this.getLiveRingMatchOrderDisplayIds();
    const previewRingMatchOrderDisplayIds = this.getPreviewRingMatchOrderDisplayIds();
    const missingRingMatchOrderDisplayIds = this.getMissingSelectedDisplayIdsForRole('ring_match_order');
    const pendingRingMatchOrderDisplayIds = this.getPendingSelectedDisplayIdsForRole('ring_match_order');
    const ringFailedCount = this.ringMatchOrderFailedDisplayErrors.size;
    const ringDisconnectedCount = this.ringMatchOrderDisconnectedDisplayIds.size;

    let scoreboardStatus = 'not-launched';
    if (previewDisplayIds.length > 0) scoreboardStatus = 'testing-display';
    else if (liveScoreboardDisplayIds.length > 0) {
      scoreboardStatus = (failedCount + disconnectedCount + missingSelectedDisplayIds.length + pendingSelectedDisplayIds.length) > 0 ? 'disconnected' : 'live';
    }

    const activeModes = Array.from(this.scoreboardWindowModes.values());
    const scoreboardMode = activeModes.length === 0
      ? 'hidden'
      : (activeModes.every((mode) => mode === 'borderless-fullscreen')
        ? 'borderless-fullscreen'
        : 'recoverable-window');

    let ringMatchOrderStatus = 'not-launched';
    if (previewRingMatchOrderDisplayIds.length > 0) ringMatchOrderStatus = 'testing-display';
    else if (liveRingMatchOrderDisplayIds.length > 0) {
      ringMatchOrderStatus = (ringFailedCount + ringDisconnectedCount + missingRingMatchOrderDisplayIds.length + pendingRingMatchOrderDisplayIds.length) > 0 ? 'disconnected' : 'live';
    }

    const ringActiveModes = Array.from(this.ringMatchOrderWindowModes.values());
    const ringMatchOrderMode = ringActiveModes.length === 0
      ? 'hidden'
      : (ringActiveModes.every((mode) => mode === 'borderless-fullscreen')
        ? 'borderless-fullscreen'
        : 'recoverable-window');

    const displayStatusesByRole = {
      scoreboard: this.getDisplayStatusByIdForRole('scoreboard'),
      ring_match_order: this.getDisplayStatusByIdForRole('ring_match_order'),
    };

    const selectedDisplayIdsByRole = {
      scoreboard: [...this.selectedScoreboardDisplayIds],
      ring_match_order: [...this.selectedRingMatchOrderDisplayIds],
    };
    const liveDisplayIdsByRole = {
      scoreboard: liveScoreboardDisplayIds,
      ring_match_order: liveRingMatchOrderDisplayIds,
    };
    const previewDisplayIdsByRole = {
      scoreboard: previewDisplayIds,
      ring_match_order: previewRingMatchOrderDisplayIds,
    };
    const missingDisplayIdsByRole = {
      scoreboard: missingSelectedDisplayIds,
      ring_match_order: missingRingMatchOrderDisplayIds,
    };
    const pendingDisplayIdsByRole = {
      scoreboard: pendingSelectedDisplayIds,
      ring_match_order: pendingRingMatchOrderDisplayIds,
    };
    const roleSessionStates = {
      scoreboard: this.broadcastSessionState,
      ring_match_order: this.ringMatchOrderSessionState,
    };
    const roleSessionSummaries = {
      scoreboard: {
        selectedCount: this.selectedScoreboardDisplayIds.length,
        liveCount: liveScoreboardDisplayIds.length,
        previewCount: previewDisplayIds.length,
        missingCount: missingSelectedDisplayIds.length,
        failedCount,
        disconnectedCount,
        pendingSelectedCount: pendingSelectedDisplayIds.length,
      },
      ring_match_order: {
        selectedCount: this.selectedRingMatchOrderDisplayIds.length,
        liveCount: liveRingMatchOrderDisplayIds.length,
        previewCount: previewRingMatchOrderDisplayIds.length,
        missingCount: missingRingMatchOrderDisplayIds.length,
        failedCount: ringFailedCount,
        disconnectedCount: ringDisconnectedCount,
        pendingSelectedCount: pendingRingMatchOrderDisplayIds.length,
      },
    };

    return {
      displays: this.displayManager.getAllDisplays(this.preferredPrimaryScoreboardDisplayId),
      displayRoles: [...DISPLAY_ROLES],
      controllerDisplayId: normalizeDisplayId(controllerDisplay && controllerDisplay.id),
      scoreboardDisplayId: normalizeDisplayId(scoreboardDisplay && scoreboardDisplay.id),
      preferredScoreboardDisplayId: this.preferredPrimaryScoreboardDisplayId,
      preferredPrimaryScoreboardDisplayId: this.preferredPrimaryScoreboardDisplayId,
      selectedScoreboardDisplayIds: [...this.selectedScoreboardDisplayIds],
      selectedRingMatchOrderDisplayIds: [...this.selectedRingMatchOrderDisplayIds],
      selectedDisplayIdsByRole,
      liveScoreboardDisplayIds,
      liveRingMatchOrderDisplayIds,
      liveDisplayIdsByRole,
      previewDisplayId: normalizeDisplayId(previewDisplay && previewDisplay.id),
      previewDisplayIds,
      previewRingMatchOrderDisplayIds,
      previewDisplayIdsByRole,
      missingSelectedDisplayIds,
      missingRingMatchOrderDisplayIds,
      missingDisplayIdsByRole,
      pendingSelectedDisplayIds,
      pendingRingMatchOrderDisplayIds,
      pendingDisplayIdsByRole,
      knownDisplayLabels: Object.fromEntries(this.knownDisplayLabels.entries()),
      scoreboardFullscreenPreference: this.scoreboardFullscreenPreference,
      scoreboardMode,
      scoreboardStatus,
      ringMatchOrderMode,
      ringMatchOrderStatus,
      isFallbackToPrimary: this.scoreboardOutputMode === 'single'
        && liveScoreboardDisplayIds.length === 1
        && normalizeDisplayId(scoreboardDisplay && scoreboardDisplay.id) === normalizeDisplayId(this.displayManager.getPrimaryDisplay().id)
        && missingSelectedDisplayIds.length > 0,
      statusNotice: this.statusNotice,
      diagnosticsEnabled: this.debugEnabled,
      scoreboardOutputMode: this.scoreboardOutputMode,
      broadcastSessionState: this.broadcastSessionState,
      ringMatchOrderSessionState: this.ringMatchOrderSessionState,
      roleSessionStates,
      displayStatuses: displayStatusesByRole.scoreboard,
      displayStatusesByRole,
      broadcastProfiles: this.broadcastProfiles,
      sessionSummary: roleSessionSummaries.scoreboard,
      roleSessionSummaries,
      updatedAt: Date.now(),
    };
  }

  pushStateToController() {
    if (!this.controllerWindow || this.controllerWindow.isDestroyed()) return;
    try {
      this.controllerWindow.webContents.send('display-management:state-changed', this.getState());
    } catch (error) {
      this.logger.warn('[display-manager] Failed to push controller state:', error && error.message ? error.message : String(error));
    }
  }

  logDisplayState(reason, state) {
    if (!this.debugEnabled) return;
    const liveScoreboardSet = new Set(state.liveScoreboardDisplayIds || []);
    const previewScoreboardSet = new Set(state.previewDisplayIds || []);
    const liveRingSet = new Set(state.liveRingMatchOrderDisplayIds || []);
    const previewRingSet = new Set(state.previewRingMatchOrderDisplayIds || []);
    const displaySummary = state.displays
      .map((display) => {
        const scoreboardMarkers = [
          (state.selectedScoreboardDisplayIds || []).includes(display.id) ? ' scoreboard-selected' : '',
          liveScoreboardSet.has(display.id) ? ' scoreboard-live' : '',
          previewScoreboardSet.has(display.id) ? ' scoreboard-preview' : '',
        ].join('');
        const ringMarkers = [
          (state.selectedRingMatchOrderDisplayIds || []).includes(display.id) ? ' ring-selected' : '',
          liveRingSet.has(display.id) ? ' ring-live' : '',
          previewRingSet.has(display.id) ? ' ring-preview' : '',
        ].join('');
        return `id=${display.id} primary=${display.isPrimary} bounds=${display.bounds.x},${display.bounds.y},${display.bounds.width}x${display.bounds.height}${scoreboardMarkers}${ringMarkers}`;
      })
      .join(' | ');
    this.logger.info(
      `[display-manager] ${reason} :: scoreboard=${state.broadcastSessionState}/${state.scoreboardStatus}/${state.scoreboardOutputMode} :: ring=${state.ringMatchOrderSessionState}/${state.ringMatchOrderStatus} :: ${displaySummary}`
    );
  }

  emitStateChange(reason) {
    const state = this.getState();
    this.logDisplayState(reason, state);
    this.pushStateToController();
    this.emit('state-changed', state);
    return state;
  }
}

module.exports = { WindowManager };
