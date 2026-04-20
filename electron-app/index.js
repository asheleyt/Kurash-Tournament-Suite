const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { app, BrowserWindow, globalShortcut, ipcMain, session } = require('electron');
const { ControllerAuthStore } = require('./controller-auth-store');
const { DisplayManager } = require('./display-manager');
const { SettingsStore } = require('./settings-store');
const { WindowManager } = require('./window-manager');
const { RuntimeOrchestrator, formatRuntimeError } = require('./runtime-orchestrator');

app.commandLine.appendSwitch('disable-http-cache');
// Keep the visible Electron app name aligned with Windows-facing branding while preserving
// the existing userData/runtime root for compatibility with current local installs.
app.setName('Kurash Tournament Suite');
app.setPath('userData', path.join(app.getPath('appData'), 'Kurash Scoreboard'));

const requestedUserDataRoot = String(process.env.KURASH_USER_DATA_ROOT || '').trim();
if (requestedUserDataRoot) {
  try {
    app.setPath('userData', requestedUserDataRoot);
    console.log(`[startup] Overrode Electron userData path: ${requestedUserDataRoot}`);
  } catch (error) {
    console.error('[startup] Failed to override Electron userData path.', {
      requestedUserDataRoot,
      error: error && error.message ? error.message : String(error),
    });
  }
}

const bootstrapOnly = process.argv.includes('--bootstrap-only') || process.env.KURASH_BOOTSTRAP_ONLY === '1';
const singleInstanceLockAcquired = app.requestSingleInstanceLock();

if (!singleInstanceLockAcquired) {
  console.log('[startup] Another Kurash Tournament Suite instance is already running. Exiting secondary process before bootstrap.');
  app.quit();
}

const STARTUP_STATES = Object.freeze({
  IDLE: 'idle',
  BOOTING: 'booting',
  READY: 'ready',
  FAILED: 'failed',
  QUITTING: 'quitting',
});

const STARTUP_STAGE_SEQUENCE = Object.freeze([
  'resolve packaged/runtime paths',
  'verify required binaries exist',
  'run PHP preflight',
  'ensure writable runtime directories exist',
  'initialize DB data if first run',
  'start MariaDB',
  'wait for real DB readiness',
  'start Laravel HTTP server',
  'wait for Laravel health endpoint',
  'start Reverb',
  'mark app ready',
]);

const STARTUP_STAGE_DESCRIPTIONS = Object.freeze({
  'resolve packaged/runtime paths': 'Resolving local runtime layout.',
  'verify required binaries exist': 'Verifying packaged service binaries.',
  'run PHP preflight': 'Checking PHP runtime readiness.',
  'ensure writable runtime directories exist': 'Preparing writable local service directories.',
  'initialize DB data if first run': 'Preparing local database files for launch.',
  'start MariaDB': 'Starting the local database service.',
  'wait for real DB readiness': 'Waiting for the local database to become ready.',
  'start Laravel HTTP server': 'Starting the controller web service.',
  'wait for Laravel health endpoint': 'Waiting for the controller health checks to pass.',
  'start Reverb': 'Starting the live relay service.',
  'mark app ready': 'Finalizing startup and preparing the controller window.',
});

const STARTUP_VIEW_DEFAULTS = Object.freeze({
  mode: 'booting',
  heading: 'STARTING CONTROLLER',
  subtitle: 'Preparing local services. The controller will open automatically when ready.',
  statusLabel: 'BOOT IN PROGRESS',
  statusText: 'Preparing runtime services for controller launch.',
  helperNote: 'Repeated launches will refocus this window.',
  footerNote: 'First launch after install may take a little longer.',
  progress: 8,
});

let controllerWindow;
let startupWindow;
let settingsStore;
let controllerAuthStore;
let displayManager;
let windowManager;
let runtimeOrchestrator;
let resultSyncDiagnosticsRegistered = false;
let startupState = STARTUP_STATES.IDLE;
let bootAttemptCounter = 0;
let activeBootAttemptId = 0;
let bootSequencePromise = null;
let isQuitting = false;
let startupViewState = { ...STARTUP_VIEW_DEFAULTS };

function getLogger() {
  return runtimeOrchestrator ? runtimeOrchestrator.logger : console;
}

function logStartupEvent(level, message, meta = {}) {
  const logger = getLogger();
  const method = typeof logger[level] === 'function' ? logger[level].bind(logger) : console.log;
  method(message, {
    startupState,
    activeBootAttemptId,
    isPackaged: app.isPackaged,
    ...meta,
  });
}

function setStartupState(nextState, meta = {}) {
  const previousState = startupState;
  startupState = nextState;
  logStartupEvent('info', 'Startup state changed.', {
    previousState,
    nextState,
    ...meta,
  });
}

function isWindowAlive(win) {
  return !!(win && typeof win.isDestroyed === 'function' && !win.isDestroyed());
}

function isActiveBootAttempt(attemptId) {
  return attemptId > 0 && activeBootAttemptId === attemptId && startupState !== STARTUP_STATES.QUITTING;
}

function buildFileUrl(filename, params = {}) {
  const fileUrl = pathToFileURL(path.join(__dirname, filename));
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }
    fileUrl.searchParams.set(key, String(value));
  });
  return fileUrl.toString();
}

function showAndFocusWindow(win) {
  if (!isWindowAlive(win)) {
    return false;
  }

  if (typeof win.isMinimized === 'function' && win.isMinimized()) {
    win.restore();
  }

  if (!win.isVisible()) {
    if (win.__kurashCanShow === false) {
      win.__kurashPendingShow = true;
    } else {
      win.show();
    }
  }

  if (win.__kurashCanShow !== false && typeof win.focus === 'function') {
    win.focus();
  }

  return true;
}

function focusActiveAppWindow() {
  if (startupState === STARTUP_STATES.READY && showAndFocusWindow(controllerWindow)) {
    return true;
  }

  if (showAndFocusWindow(startupWindow)) {
    return true;
  }

  return showAndFocusWindow(controllerWindow);
}

function getCurrentRuntimeDescriptor() {
  if (!runtimeOrchestrator || !runtimeOrchestrator.state) {
    return null;
  }

  return {
    localBackendBaseUrl: runtimeOrchestrator.localBackendBaseUrl,
    logsDir: runtimeOrchestrator.logsDir,
    runtimePaths: runtimeOrchestrator.state,
  };
}

function buildStartupStagePatch(stageName, status = 'in_progress') {
  const stageIndex = STARTUP_STAGE_SEQUENCE.indexOf(stageName);
  if (stageIndex === -1) {
    return null;
  }

  const totalStages = STARTUP_STAGE_SEQUENCE.length;
  const completedProgress = Math.round(((stageIndex + 1) / totalStages) * 100);
  const activeProgress = Math.max(STARTUP_VIEW_DEFAULTS.progress, Math.min(99, Math.round((stageIndex / totalStages) * 100) + 8));

  return {
    mode: status === 'failed' ? 'failure' : 'booting',
    statusLabel: stageName === 'mark app ready' && status !== 'failed' ? 'FINALIZING STARTUP' : 'BOOT IN PROGRESS',
    statusText: STARTUP_STAGE_DESCRIPTIONS[stageName] || 'Preparing runtime services for controller launch.',
    progress: status === 'success' ? completedProgress : activeProgress,
  };
}

function syncStartupWindowView(targetWindow = startupWindow) {
  if (!isWindowAlive(targetWindow) || !targetWindow.webContents || targetWindow.webContents.isDestroyed()) {
    return;
  }

  const serializedState = JSON.stringify(startupViewState);
  const applyStateScript = `(() => {
    if (!window.KTSStartupScreen || typeof window.KTSStartupScreen.applyState !== 'function') {
      return false;
    }
    window.KTSStartupScreen.applyState(${serializedState});
    return true;
  })()`;

  targetWindow.webContents.executeJavaScript(applyStateScript, true).catch((error) => {
    if (!isWindowAlive(targetWindow)) {
      return;
    }

    logStartupEvent('warn', 'Failed to synchronize startup window state.', {
      error: error && error.message ? error.message : String(error),
    });
  });
}

function mergeStartupViewState(patch = {}) {
  startupViewState = {
    ...startupViewState,
    ...patch,
  };

  syncStartupWindowView();
}

function resetStartupViewState() {
  startupViewState = { ...STARTUP_VIEW_DEFAULTS };
  syncStartupWindowView();
}

function handleRuntimeStageUpdate(update = {}) {
  if (!update || typeof update.stageName !== 'string') {
    return;
  }

  const patch = buildStartupStagePatch(update.stageName, update.status);
  if (!patch) {
    return;
  }

  mergeStartupViewState(patch);
}

function createStartupWindow() {
  if (bootstrapOnly) {
    return null;
  }

  if (isWindowAlive(startupWindow)) {
    return startupWindow;
  }

  const win = new BrowserWindow({
    title: 'Kurash Tournament Suite',
    width: 920,
    height: 560,
    minWidth: 760,
    minHeight: 440,
    show: false,
    frame: false,
    autoHideMenuBar: true,
    fullscreen: false,
    fullscreenable: false,
    maximizable: false,
    resizable: false,
    backgroundColor: '#0f172a',
    paintWhenInitiallyHidden: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const revealStartupWindow = () => {
    if (startupWindow !== win) {
      return;
    }
    showAndFocusWindow(win);
  };

  startupWindow = win;
  win.setMenu(null);
  win.once('ready-to-show', revealStartupWindow);
  win.webContents.once('did-finish-load', revealStartupWindow);
  win.webContents.on('did-finish-load', () => {
    if (startupWindow !== win) {
      return;
    }

    syncStartupWindowView(win);
  });
  win.on('closed', () => {
    const shouldQuitBecauseBootNotReady = startupWindow === win
      && (startupState === STARTUP_STATES.BOOTING || startupState === STARTUP_STATES.FAILED);

    if (startupWindow === win) {
      startupWindow = null;
    }

    if (shouldQuitBecauseBootNotReady && !isQuitting) {
      logStartupEvent('warn', 'Startup/failure window was closed before the app became ready. Quitting current boot attempt.');
      activeBootAttemptId = 0;
      app.quit();
    }
  });

  win.loadURL(buildFileUrl('startup.html'));
  return win;
}

function closeStartupWindow() {
  if (!isWindowAlive(startupWindow)) {
    startupWindow = null;
    return;
  }

  const win = startupWindow;
  startupWindow = null;
  win.close();
}

function showStartupFailure(message, attemptId) {
  if (!isActiveBootAttempt(attemptId) || bootstrapOnly) {
    return;
  }

  const win = createStartupWindow();
  if (!isWindowAlive(win)) {
    return;
  }

  setStartupState(STARTUP_STATES.FAILED, { attemptId });
  win.loadURL(buildFileUrl('error.html', { message }));
  showAndFocusWindow(win);
}

function waitForWindowReady(win, label) {
  return new Promise((resolve, reject) => {
    if (!isWindowAlive(win)) {
      reject(new Error(`${label} was destroyed before it became ready.`));
      return;
    }

    let settled = false;

    const cleanup = () => {
      win.removeListener('ready-to-show', handleReady);
      win.removeListener('closed', handleClosed);
      if (win.webContents && !win.webContents.isDestroyed()) {
        win.webContents.removeListener('did-finish-load', handleReady);
        win.webContents.removeListener('did-fail-load', handleFailLoad);
      }
    };

    const finishResolve = () => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      resolve();
    };

    const finishReject = (error) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      reject(error);
    };

    const handleReady = () => finishResolve();
    const handleClosed = () => finishReject(new Error(`${label} closed before startup completed.`));
    const handleFailLoad = (_event, errorCode, errorDescription, validatedUrl, isMainFrame) => {
      if (isMainFrame === false) {
        return;
      }

      finishReject(
        new Error(
          `${label} failed to load (${errorDescription || errorCode})${validatedUrl ? `: ${validatedUrl}` : ''}`
        )
      );
    };

    win.once('ready-to-show', handleReady);
    win.once('closed', handleClosed);
    win.webContents.once('did-finish-load', handleReady);
    win.webContents.on('did-fail-load', handleFailLoad);

    if (win.__kurashCanShow === true || win.isVisible()) {
      finishResolve();
    }
  });
}

function isDevToolsShortcutInput(input) {
  if (!input || input.type !== 'keyDown') {
    return false;
  }

  const key = String(input.key || '').toUpperCase();
  return key === 'F12' || (key === 'I' && input.shift && (input.control || input.meta));
}

function attachPackagedShortcutGuards(win) {
  if (!app.isPackaged || !win || !win.webContents || win.webContents.isDestroyed()) {
    return;
  }

  win.webContents.on('before-input-event', (event, input) => {
    if (!isDevToolsShortcutInput(input)) {
      return;
    }

    event.preventDefault();

    try {
      if (win.webContents.isDevToolsOpened()) {
        win.webContents.closeDevTools();
      }
    } catch (error) {
      getLogger().warn('Failed to close DevTools after blocking packaged shortcut.', {
        error: error && error.message ? error.message : String(error),
        windowTitle: typeof win.getTitle === 'function' ? win.getTitle() : null,
      });
    }

    getLogger().info('Blocked DevTools shortcut in packaged mode.', {
      shortcut: String(input.key || ''),
      windowTitle: typeof win.getTitle === 'function' ? win.getTitle() : null,
    });
  });
}

function attachWindowDiagnostics(win) {
  if (!win || !win.webContents) {
    return;
  }

  let lastKnownTitle = null;
  let lastKnownUrl = null;

  const getSafeWindowTitle = () => {
    if (!win || (typeof win.isDestroyed === 'function' && win.isDestroyed())) {
      return lastKnownTitle;
    }

    if (typeof win.getTitle !== 'function') {
      return lastKnownTitle;
    }

    try {
      const title = win.getTitle();
      if (title) {
        lastKnownTitle = title;
      }
      return title || lastKnownTitle;
    } catch (_error) {
      return lastKnownTitle;
    }
  };

  const getSafeCurrentUrl = () => {
    if (
      !win ||
      (typeof win.isDestroyed === 'function' && win.isDestroyed()) ||
      !win.webContents ||
      (typeof win.webContents.isDestroyed === 'function' && win.webContents.isDestroyed())
    ) {
      return lastKnownUrl;
    }

    if (typeof win.webContents.getURL !== 'function') {
      return lastKnownUrl;
    }

    try {
      const url = win.webContents.getURL();
      if (url) {
        lastKnownUrl = url;
      }
      return url || lastKnownUrl;
    } catch (_error) {
      return lastKnownUrl;
    }
  };

  const logWindowEvent = (message, meta = null) => {
    getLogger().info(message, {
      windowTitle: getSafeWindowTitle(),
      ...(meta || {}),
    });
  };

  logWindowEvent('BrowserWindow created.');

  win.on('ready-to-show', () => {
    logWindowEvent('BrowserWindow ready to show.');
  });

  win.on('show', () => {
    logWindowEvent('BrowserWindow shown.');
  });

  win.on('closed', () => {
    logWindowEvent('BrowserWindow closed.');
  });

  win.webContents.on('did-finish-load', () => {
    logWindowEvent('BrowserWindow finished loading.', {
      currentUrl: getSafeCurrentUrl(),
    });
  });
}

app.on('browser-window-created', (_event, win) => {
  attachPackagedShortcutGuards(win);
  attachWindowDiagnostics(win);
});

function getRendererBuildStamp() {
  if (!runtimeOrchestrator || !runtimeOrchestrator.state || !runtimeOrchestrator.state.laravelRoot) {
    return null;
  }

  const manifestPath = path.join(runtimeOrchestrator.state.laravelRoot, 'public', 'build', 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    try {
      const stat = fs.statSync(manifestPath);
      return `manifest:${stat.mtime.toISOString()}`;
    } catch (_error) {
      return 'manifest:present';
    }
  }

  const hotPath = path.join(runtimeOrchestrator.state.laravelRoot, 'public', 'hot');
  if (fs.existsSync(hotPath)) {
    try {
      const hotValue = String(fs.readFileSync(hotPath, 'utf8') || '').trim();
      return hotValue ? `hot:${hotValue}` : 'hot:present';
    } catch (_error) {
      return 'hot:present';
    }
  }

  return null;
}

function parseUploadBody(details) {
  try {
    const chunks = [];
    for (const part of details.uploadData || []) {
      if (part && part.bytes) {
        chunks.push(Buffer.from(part.bytes).toString('utf8'));
      }
    }

    const rawBody = chunks.join('').trim();
    if (!rawBody) {
      return { rawBody: '', jsonBody: null };
    }

    try {
      return {
        rawBody,
        jsonBody: JSON.parse(rawBody),
      };
    } catch (_error) {
      return {
        rawBody,
        jsonBody: null,
      };
    }
  } catch (_error) {
    return { rawBody: '', jsonBody: null };
  }
}

function registerResultSyncDiagnostics(baseUrl) {
  if (resultSyncDiagnosticsRegistered || !baseUrl) {
    return;
  }

  const relayPattern = `${String(baseUrl).replace(/\/+$/, '')}/api/matches/*/result*`;
  const filter = { urls: [relayPattern] };
  const logger = getLogger();
  resultSyncDiagnosticsRegistered = true;

  logger.info('Registered Electron result-sync diagnostics.', {
    relayPattern,
    appVersion: app.getVersion(),
    isPackaged: app.isPackaged,
    localBackendBaseUrl: baseUrl,
    rendererBuildStamp: getRendererBuildStamp(),
  });

  session.defaultSession.webRequest.onBeforeRequest(filter, (details, callback) => {
    const { rawBody, jsonBody } = parseUploadBody(details);
    logger.info('[result-sync] electron.webRequest.before', {
      stage: 'electron.webRequest.before',
      method: details.method,
      url: details.url,
      webContentsId: details.webContentsId ?? null,
      frameType: details.resourceType ?? null,
      rendererBuildStamp: getRendererBuildStamp(),
      request_body: jsonBody || rawBody || null,
      normalized_match_id: jsonBody && typeof jsonBody === 'object' ? jsonBody.match_id ?? null : null,
      normalized_winner_id: jsonBody && typeof jsonBody === 'object' ? jsonBody.winner_id ?? null : null,
      winner_side: jsonBody && typeof jsonBody === 'object' ? jsonBody.winner_side ?? null : null,
    });
    callback({ cancel: false });
  });

  session.defaultSession.webRequest.onCompleted(filter, (details) => {
    logger.info('[result-sync] electron.webRequest.completed', {
      stage: 'electron.webRequest.completed',
      method: details.method,
      url: details.url,
      statusCode: details.statusCode,
      fromCache: details.fromCache,
      webContentsId: details.webContentsId ?? null,
      rendererBuildStamp: getRendererBuildStamp(),
    });
  });

  session.defaultSession.webRequest.onErrorOccurred(filter, (details) => {
    logger.warn('[result-sync] electron.webRequest.error', {
      stage: 'electron.webRequest.error',
      method: details.method,
      url: details.url,
      error: details.error,
      webContentsId: details.webContentsId ?? null,
      rendererBuildStamp: getRendererBuildStamp(),
    });
  });
}

function registerGlobalShortcuts() {
  globalShortcut.unregisterAll();

  globalShortcut.register('CommandOrControl+Shift+Q', () => {
    app.quit();
  });

  const toggleDevToolsForFocused = () => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) return;

    try {
      if (win.webContents.isDevToolsOpened()) win.webContents.closeDevTools();
      else win.webContents.openDevTools({ mode: 'detach' });
    } catch (error) {
      const logger = runtimeOrchestrator ? runtimeOrchestrator.logger : console;
      logger.warn('Failed to toggle DevTools', {
        error: error && error.message ? error.message : String(error),
      });
    }
  };

  if (app.isPackaged) {
    getLogger().info('DevTools shortcuts are disabled in packaged mode.');
    return;
  }

  globalShortcut.register('CommandOrControl+Shift+I', toggleDevToolsForFocused);
  globalShortcut.register('F12', toggleDevToolsForFocused);
}

function registerDisplayIpc() {
  ipcMain.removeHandler('display-management:get-state');
  ipcMain.removeHandler('display-management:set-output-mode');
  ipcMain.removeHandler('display-management:set-selected-displays');
  ipcMain.removeHandler('display-management:add-selected-display');
  ipcMain.removeHandler('display-management:remove-selected-display');
  ipcMain.removeHandler('display-management:select-all-external');
  ipcMain.removeHandler('display-management:clear-selected-displays');
  ipcMain.removeHandler('display-management:test-selected-displays');
  ipcMain.removeHandler('display-management:launch-broadcast');
  ipcMain.removeHandler('display-management:stop-broadcast');
  ipcMain.removeHandler('display-management:readd-scoreboard-display');
  ipcMain.removeHandler('display-management:save-broadcast-profile');
  ipcMain.removeHandler('display-management:apply-broadcast-profile');
  ipcMain.removeHandler('display-management:delete-broadcast-profile');
  ipcMain.removeHandler('display-management:launch-scoreboard');
  ipcMain.removeHandler('display-management:test-scoreboard-display');
  ipcMain.removeHandler('display-management:move-controller');
  ipcMain.removeHandler('display-management:move-scoreboard');
  ipcMain.removeHandler('display-management:move-scoreboard-primary');
  ipcMain.removeHandler('display-management:close-scoreboard');
  ipcMain.removeHandler('display-management:swap-displays');
  ipcMain.removeHandler('display-management:rescan');
  ipcMain.removeHandler('display-management:toggle-scoreboard-fullscreen');
  ipcMain.removeHandler('display-management:set-selected-displays-for-role');
  ipcMain.removeHandler('display-management:clear-selected-displays-for-role');
  ipcMain.removeHandler('display-management:select-all-external-for-role');
  ipcMain.removeHandler('display-management:test-role-displays');
  ipcMain.removeHandler('display-management:launch-role-displays');
  ipcMain.removeHandler('display-management:stop-role-displays');
  ipcMain.removeHandler('display-management:move-role-to-display');
  ipcMain.removeHandler('display-management:readd-role-display');

  ipcMain.handle('display-management:get-state', () => windowManager.getState());
  ipcMain.handle('display-management:set-output-mode', (_event, mode) =>
    windowManager.setOutputMode(mode)
  );
  ipcMain.handle('display-management:set-selected-displays', (_event, displayIds) =>
    windowManager.setSelectedDisplays(displayIds)
  );
  ipcMain.handle('display-management:add-selected-display', (_event, displayId) =>
    windowManager.addSelectedDisplay(displayId)
  );
  ipcMain.handle('display-management:remove-selected-display', (_event, displayId) =>
    windowManager.removeSelectedDisplay(displayId)
  );
  ipcMain.handle('display-management:select-all-external', () =>
    windowManager.selectAllExternalDisplays()
  );
  ipcMain.handle('display-management:clear-selected-displays', () =>
    windowManager.clearSelectedDisplays()
  );
  ipcMain.handle('display-management:test-selected-displays', () =>
    windowManager.testSelectedDisplays()
  );
  ipcMain.handle('display-management:launch-broadcast', () =>
    windowManager.launchBroadcast()
  );
  ipcMain.handle('display-management:stop-broadcast', () =>
    windowManager.stopBroadcast()
  );
  ipcMain.handle('display-management:readd-scoreboard-display', (_event, displayId) =>
    windowManager.reAddScoreboardDisplay(displayId)
  );
  ipcMain.handle('display-management:save-broadcast-profile', (_event, name) =>
    windowManager.saveBroadcastProfile(name)
  );
  ipcMain.handle('display-management:apply-broadcast-profile', (_event, profileId) =>
    windowManager.applyBroadcastProfile(profileId)
  );
  ipcMain.handle('display-management:delete-broadcast-profile', (_event, profileId) =>
    windowManager.deleteBroadcastProfile(profileId)
  );
  ipcMain.handle('display-management:launch-scoreboard', (_event, displayId) =>
    windowManager.launchScoreboardOnDisplay(displayId, { manual: true })
  );
  ipcMain.handle('display-management:test-scoreboard-display', (_event, displayId) =>
    windowManager.showDisplayTestOnDisplay(displayId, { manual: true })
  );
  ipcMain.handle('display-management:move-controller', (_event, displayId) =>
    windowManager.moveControllerToDisplay(displayId)
  );
  ipcMain.handle('display-management:move-scoreboard', (_event, displayId) =>
    windowManager.moveScoreboardToDisplay(displayId, { manual: true })
  );
  ipcMain.handle('display-management:move-scoreboard-primary', () =>
    windowManager.moveScoreboardToPrimary({ manual: true })
  );
  ipcMain.handle('display-management:close-scoreboard', () =>
    windowManager.closeScoreboard()
  );
  ipcMain.handle('display-management:swap-displays', () => windowManager.swapWindowsBetweenDisplays());
  ipcMain.handle('display-management:rescan', () => windowManager.rescanDisplays());
  ipcMain.handle('display-management:toggle-scoreboard-fullscreen', (_event, force) =>
    windowManager.toggleScoreboardFullscreen(force)
  );
  ipcMain.handle('display-management:set-selected-displays-for-role', (_event, role, displayIds) =>
    windowManager.setSelectedDisplaysForRole(role, displayIds)
  );
  ipcMain.handle('display-management:clear-selected-displays-for-role', (_event, role) =>
    windowManager.clearSelectedDisplaysForRole(role)
  );
  ipcMain.handle('display-management:select-all-external-for-role', (_event, role) =>
    windowManager.selectAllExternalDisplaysForRole(role)
  );
  ipcMain.handle('display-management:test-role-displays', (_event, role) =>
    windowManager.testRoleDisplays(role)
  );
  ipcMain.handle('display-management:launch-role-displays', (_event, role) =>
    windowManager.launchRoleDisplays(role)
  );
  ipcMain.handle('display-management:stop-role-displays', (_event, role) =>
    windowManager.stopRoleDisplays(role)
  );
  ipcMain.handle('display-management:move-role-to-display', (_event, role, displayId) =>
    windowManager.moveRoleToDisplay(role, displayId, { manual: true })
  );
  ipcMain.handle('display-management:readd-role-display', (_event, role, displayId) =>
    windowManager.reAddRoleDisplay(role, displayId)
  );
}

function registerControllerAuthIpc() {
  ipcMain.removeHandler('controller-auth:get-state');
  ipcMain.removeHandler('controller-auth:update-state');
  ipcMain.removeHandler('controller-auth:clear-auth');

  ipcMain.handle('controller-auth:get-state', () => controllerAuthStore.getState());
  ipcMain.handle('controller-auth:update-state', (_event, partial) =>
    controllerAuthStore.updateState(partial)
  );
  ipcMain.handle('controller-auth:clear-auth', (_event, reason) =>
    controllerAuthStore.clearAuth(reason)
  );
}

async function createWindows(baseUrl, attemptId) {
  if (!isActiveBootAttempt(attemptId)) {
    logStartupEvent('warn', 'Skipped window creation because the boot attempt is no longer active.', {
      attemptId,
      baseUrl,
    });
    return null;
  }

  const preloadPath = path.join(__dirname, 'preload.js');
  const logger = runtimeOrchestrator ? runtimeOrchestrator.logger : console;

  settingsStore = new SettingsStore(app);
  controllerAuthStore = new ControllerAuthStore(app, logger);
  displayManager = new DisplayManager();
  windowManager = new WindowManager({
    app,
    displayManager,
    settingsStore,
    preloadPath,
    logger,
  });

  registerDisplayIpc();
  registerControllerAuthIpc();

  const controllerUrl = `${String(baseUrl).replace(/\/+$/, '')}/refereeController`;
  const scoreboardSplashUrl = buildFileUrl('splash.html', { url: `${String(baseUrl).replace(/\/+$/, '')}/kurashScoreBoard` });
  const ringMatchOrderSplashUrl = buildFileUrl('splash.html', { url: `${String(baseUrl).replace(/\/+$/, '')}/ringMatchOrder` });

  controllerWindow = windowManager.createControllerWindow(controllerUrl);
  windowManager.createScoreboardWindow(scoreboardSplashUrl);
  windowManager.createRingMatchOrderWindow(ringMatchOrderSplashUrl);
  windowManager.registerDisplayListeners();

  const activeControllerWindow = controllerWindow;
  activeControllerWindow.on('closed', () => {
    if (controllerWindow === activeControllerWindow) {
      controllerWindow = null;
    }
    app.quit();
  });

  registerGlobalShortcuts();
  await waitForWindowReady(activeControllerWindow, 'Controller window');

  if (!isActiveBootAttempt(attemptId)) {
    logStartupEvent('warn', 'Controller window became ready after the boot attempt was invalidated.', {
      attemptId,
      controllerUrl,
    });
    if (isWindowAlive(activeControllerWindow)) {
      activeControllerWindow.close();
    }
    return null;
  }

  showAndFocusWindow(activeControllerWindow);
  return activeControllerWindow;
}

async function ensureBootSequence() {
  if (!singleInstanceLockAcquired) {
    return null;
  }

  if (startupState === STARTUP_STATES.READY) {
    logStartupEvent('info', 'Boot sequence requested after startup completed; reusing existing runtime state.');
    return getCurrentRuntimeDescriptor();
  }

  if (startupState === STARTUP_STATES.FAILED || startupState === STARTUP_STATES.QUITTING) {
    logStartupEvent('warn', 'Ignored boot request because the app is already in a terminal startup state.');
    return null;
  }

  if (bootSequencePromise) {
    logStartupEvent('info', 'Boot sequence already in progress; returning the active boot promise.');
    return bootSequencePromise;
  }

  const attemptId = ++bootAttemptCounter;
  activeBootAttemptId = attemptId;
  setStartupState(STARTUP_STATES.BOOTING, { attemptId });
  resetStartupViewState();

  if (!runtimeOrchestrator) {
    runtimeOrchestrator = new RuntimeOrchestrator(app, {
      onStageUpdate: handleRuntimeStageUpdate,
    });
  }

  if (!bootstrapOnly) {
    createStartupWindow();
  }

  bootSequencePromise = (async () => {
    try {
      logStartupEvent('info', 'Beginning guarded runtime bootstrap.', { attemptId });
      const runtime = await runtimeOrchestrator.start();

      if (!isActiveBootAttempt(attemptId)) {
        logStartupEvent('warn', 'Discarded runtime bootstrap completion from a stale boot attempt.', { attemptId });
        return getCurrentRuntimeDescriptor();
      }

      registerResultSyncDiagnostics(runtime.localBackendBaseUrl);

      if (bootstrapOnly) {
        setStartupState(STARTUP_STATES.READY, { attemptId, bootstrapOnly: true });
        const holdMsRaw = Number.parseInt(process.env.KURASH_BOOTSTRAP_ONLY_HOLD_MS || '5000', 10);
        const holdMs = Number.isFinite(holdMsRaw) && holdMsRaw >= 0 ? holdMsRaw : 5000;
        runtimeOrchestrator.logger.info('Bootstrap-only packaged validation mode is active. Exiting without creating windows.', {
          attemptId,
          holdMs,
          localBackendBaseUrl: runtime.localBackendBaseUrl,
        });
        setTimeout(() => app.quit(), holdMs);
        return runtime;
      }

      mergeStartupViewState({
        statusLabel: 'OPENING CONTROLLER',
        statusText: 'Launching the controller interface.',
        progress: 100,
      });

      await createWindows(runtime.localBackendBaseUrl, attemptId);

      void session.defaultSession.clearCache()
        .then(() => {
          runtimeOrchestrator.logger.info('Cleared Electron HTTP cache after controller launch handoff.', { attemptId });
        })
        .catch((error) => {
          runtimeOrchestrator.logger.warn('Failed to clear Electron HTTP cache after controller launch handoff.', {
            attemptId,
            error: error && error.message ? error.message : String(error),
          });
        });

      if (!isActiveBootAttempt(attemptId)) {
        logStartupEvent('warn', 'Skipped startup window teardown because the boot attempt is no longer active.', {
          attemptId,
        });
        return runtime;
      }

      setStartupState(STARTUP_STATES.READY, { attemptId });
      closeStartupWindow();
      return runtime;
    } catch (error) {
      if (!isActiveBootAttempt(attemptId)) {
        logStartupEvent('warn', 'Ignored runtime bootstrap error from a stale boot attempt.', {
          attemptId,
          error: error && error.message ? error.message : String(error),
        });
        return null;
      }

      const logsDir = runtimeOrchestrator ? runtimeOrchestrator.logsDir : path.join(app.getPath('userData'), 'logs');
      const formattedMessage = formatRuntimeError(error, logsDir);

      if (runtimeOrchestrator) {
        runtimeOrchestrator.logger.error('Runtime bootstrap failed before the controller window became ready.', {
          attemptId,
          stage: error && error.stage ? error.stage : null,
          reason: error && error.reason ? error.reason : (error && error.message ? error.message : String(error)),
          details: error && error.details ? error.details : null,
        });
      } else {
        console.error(error);
      }

      if (bootstrapOnly) {
        setStartupState(STARTUP_STATES.FAILED, { attemptId, bootstrapOnly: true });
        app.exit(1);
        return null;
      }

      showStartupFailure(formattedMessage, attemptId);
      return null;
    } finally {
      if (bootSequencePromise) {
        bootSequencePromise = null;
      }
    }
  })();

  return bootSequencePromise;
}

app.on('second-instance', () => {
  logStartupEvent('info', 'Received second-instance launch request.');
  if (!focusActiveAppWindow()) {
    logStartupEvent('warn', 'No existing startup or controller window was available to focus for the second instance.');
  }
});

app.on('activate', () => {
  if (!focusActiveAppWindow() && startupState === STARTUP_STATES.IDLE) {
    void ensureBootSequence();
  }
});

app.whenReady().then(async () => {
  await ensureBootSequence();
});

app.on('will-quit', () => {
  isQuitting = true;
  setStartupState(STARTUP_STATES.QUITTING);
  globalShortcut.unregisterAll();

  if (windowManager) {
    windowManager.unregisterDisplayListeners();
  }

  if (runtimeOrchestrator) {
    runtimeOrchestrator.shutdown();
  }
});
