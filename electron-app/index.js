const fs = require('fs');
const path = require('path');
const { app, BrowserWindow, globalShortcut, ipcMain, session } = require('electron');
const { ControllerAuthStore } = require('./controller-auth-store');
const { DisplayManager } = require('./display-manager');
const { SettingsStore } = require('./settings-store');
const { WindowManager } = require('./window-manager');
const { RuntimeOrchestrator, formatRuntimeError } = require('./runtime-orchestrator');

app.commandLine.appendSwitch('disable-http-cache');
// Keep packaged userData/runtime paths stable while installer-facing branding moves to KTS.
app.setName('Kurash Scoreboard');

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

let controllerWindow;
let settingsStore;
let controllerAuthStore;
let displayManager;
let windowManager;
let runtimeOrchestrator;
let resultSyncDiagnosticsRegistered = false;

function getLogger() {
  return runtimeOrchestrator ? runtimeOrchestrator.logger : console;
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

async function createWindows(baseUrl) {
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

  const controllerSplashUrl = `file://${path.join(__dirname, 'splash.html')}?url=${encodeURIComponent(baseUrl + '/refereeController')}`;
  const scoreboardSplashUrl = `file://${path.join(__dirname, 'splash.html')}?url=${encodeURIComponent(baseUrl + '/kurashScoreBoard')}`;
  const ringMatchOrderSplashUrl = `file://${path.join(__dirname, 'splash.html')}?url=${encodeURIComponent(baseUrl + '/ringMatchOrder')}`;

  controllerWindow = windowManager.createControllerWindow(controllerSplashUrl);
  windowManager.createScoreboardWindow(scoreboardSplashUrl);
  windowManager.createRingMatchOrderWindow(ringMatchOrderSplashUrl);
  windowManager.registerDisplayListeners();

  controllerWindow.on('closed', () => {
    app.quit();
  });

  registerGlobalShortcuts();
}

function createErrorWindow(message) {
  const win = new BrowserWindow({
    title: 'Kurash Tournament Suite - Startup Error',
    frame: false,
    fullscreen: true,
    backgroundColor: '#0f172a',
    webPreferences: { nodeIntegration: false },
  });

  const errorUrl = `file://${path.join(__dirname, 'error.html')}?message=${encodeURIComponent(message)}`;
  win.loadURL(errorUrl);
  win.setMenu(null);
}

app.whenReady().then(async () => {
  runtimeOrchestrator = new RuntimeOrchestrator(app);

  try {
    const runtime = await runtimeOrchestrator.start();

    try {
      await session.defaultSession.clearCache();
      runtimeOrchestrator.logger.info('Cleared Electron HTTP cache after runtime bootstrap.');
    } catch (error) {
      runtimeOrchestrator.logger.warn('Failed to clear Electron HTTP cache.', {
        error: error && error.message ? error.message : String(error),
      });
    }

    registerResultSyncDiagnostics(runtime.localBackendBaseUrl);

    if (bootstrapOnly) {
      const holdMsRaw = Number.parseInt(process.env.KURASH_BOOTSTRAP_ONLY_HOLD_MS || '5000', 10);
      const holdMs = Number.isFinite(holdMsRaw) && holdMsRaw >= 0 ? holdMsRaw : 5000;
      runtimeOrchestrator.logger.info('Bootstrap-only packaged validation mode is active. Exiting without creating windows.', {
        holdMs,
        localBackendBaseUrl: runtime.localBackendBaseUrl,
      });
      setTimeout(() => app.quit(), holdMs);
      return;
    }

    await createWindows(runtime.localBackendBaseUrl);
  } catch (error) {
    const logsDir = runtimeOrchestrator ? runtimeOrchestrator.logsDir : path.join(app.getPath('userData'), 'logs');
    const formattedMessage = formatRuntimeError(error, logsDir);

    if (runtimeOrchestrator) {
      runtimeOrchestrator.logger.error('Runtime bootstrap failed before windows were created.', {
        stage: error && error.stage ? error.stage : null,
        reason: error && error.reason ? error.reason : (error && error.message ? error.message : String(error)),
        details: error && error.details ? error.details : null,
      });
    } else {
      console.error(error);
    }

    if (bootstrapOnly) {
      app.exit(1);
      return;
    }

    createErrorWindow(formattedMessage);
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();

  if (windowManager) {
    windowManager.unregisterDisplayListeners();
  }

  if (runtimeOrchestrator) {
    runtimeOrchestrator.shutdown();
  }
});
