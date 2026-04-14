const { contextBridge, ipcRenderer } = require('electron');

const DISPLAY_STATE_CHANNEL = 'display-management:state-changed';

contextBridge.exposeInMainWorld('kurashElectron', {
  displayManagement: {
    getState: () => ipcRenderer.invoke('display-management:get-state'),

    setOutputMode: (mode) => ipcRenderer.invoke('display-management:set-output-mode', mode),
    setSelectedDisplays: (displayIds) => ipcRenderer.invoke('display-management:set-selected-displays', displayIds),
    addSelectedDisplay: (displayId) => ipcRenderer.invoke('display-management:add-selected-display', displayId),
    removeSelectedDisplay: (displayId) => ipcRenderer.invoke('display-management:remove-selected-display', displayId),
    selectAllExternalDisplays: () => ipcRenderer.invoke('display-management:select-all-external'),
    clearSelectedDisplays: () => ipcRenderer.invoke('display-management:clear-selected-displays'),
    testSelectedDisplays: () => ipcRenderer.invoke('display-management:test-selected-displays'),
    launchBroadcast: () => ipcRenderer.invoke('display-management:launch-broadcast'),
    stopBroadcast: () => ipcRenderer.invoke('display-management:stop-broadcast'),
    reAddScoreboardDisplay: (displayId) => ipcRenderer.invoke('display-management:readd-scoreboard-display', displayId),
    saveBroadcastProfile: (name) => ipcRenderer.invoke('display-management:save-broadcast-profile', name),
    applyBroadcastProfile: (profileId) => ipcRenderer.invoke('display-management:apply-broadcast-profile', profileId),
    deleteBroadcastProfile: (profileId) => ipcRenderer.invoke('display-management:delete-broadcast-profile', profileId),
    launchScoreboardOnDisplay: (displayId) => ipcRenderer.invoke('display-management:launch-scoreboard', displayId),
    testScoreboardDisplay: (displayId) => ipcRenderer.invoke('display-management:test-scoreboard-display', displayId),
    moveControllerToDisplay: (displayId) => ipcRenderer.invoke('display-management:move-controller', displayId),
    moveScoreboardToDisplay: (displayId) => ipcRenderer.invoke('display-management:move-scoreboard', displayId),
    moveScoreboardToPrimary: () => ipcRenderer.invoke('display-management:move-scoreboard-primary'),
    closeScoreboard: () => ipcRenderer.invoke('display-management:close-scoreboard'),
    swapDisplays: () => ipcRenderer.invoke('display-management:swap-displays'),
    rescanDisplays: () => ipcRenderer.invoke('display-management:rescan'),
    toggleScoreboardFullscreen: (force) => ipcRenderer.invoke('display-management:toggle-scoreboard-fullscreen', force),

    setSelectedDisplaysForRole: (role, displayIds) => ipcRenderer.invoke('display-management:set-selected-displays-for-role', role, displayIds),
    clearSelectedDisplaysForRole: (role) => ipcRenderer.invoke('display-management:clear-selected-displays-for-role', role),
    selectAllExternalDisplaysForRole: (role) => ipcRenderer.invoke('display-management:select-all-external-for-role', role),
    testRoleDisplays: (role) => ipcRenderer.invoke('display-management:test-role-displays', role),
    launchRoleDisplays: (role) => ipcRenderer.invoke('display-management:launch-role-displays', role),
    stopRoleDisplays: (role) => ipcRenderer.invoke('display-management:stop-role-displays', role),
    moveRoleToDisplay: (role, displayId) => ipcRenderer.invoke('display-management:move-role-to-display', role, displayId),
    reAddRoleDisplay: (role, displayId) => ipcRenderer.invoke('display-management:readd-role-display', role, displayId),

    onStateChanged: (callback) => {
      if (typeof callback !== 'function') {
        return () => {};
      }

      const listener = (_event, state) => callback(state);
      ipcRenderer.on(DISPLAY_STATE_CHANNEL, listener);

      return () => {
        ipcRenderer.removeListener(DISPLAY_STATE_CHANNEL, listener);
      };
    },
  },
  controllerAuth: {
    getState: () => ipcRenderer.invoke('controller-auth:get-state'),
    updateState: (partial) => ipcRenderer.invoke('controller-auth:update-state', partial),
    clearAuth: (reason) => ipcRenderer.invoke('controller-auth:clear-auth', reason),
  },
});
