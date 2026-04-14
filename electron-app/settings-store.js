const fs = require('fs');
const path = require('path');

const DISPLAY_ROLES = Object.freeze(['scoreboard', 'ring_match_order']);

const DEFAULT_DISPLAY_SETTINGS = Object.freeze({
  preferredScoreboardDisplayId: null,
  preferredPrimaryScoreboardDisplayId: null,
  selectedScoreboardDisplayIds: [],
  selectedRingMatchOrderDisplayIds: [],
  scoreboardOutputMode: 'single',
  broadcastProfiles: [],
  scoreboardFullscreen: true,
});

function normalizeDisplayId(value) {
  if (value === null || value === undefined || value === '') return null;
  return String(value);
}

function normalizeDisplayIds(values) {
  if (!Array.isArray(values)) return [];
  const seen = new Set();
  return values
    .map((value) => normalizeDisplayId(value))
    .filter((value) => {
      if (!value || seen.has(value)) return false;
      seen.add(value);
      return true;
    });
}

function normalizeDisplayIdsByRole(value) {
  const source = value && typeof value === 'object' ? value : {};
  return {
    scoreboard: normalizeDisplayIds(
      source.scoreboard
      ?? source.selectedScoreboardDisplayIds
      ?? []
    ),
    ring_match_order: normalizeDisplayIds(
      source.ring_match_order
      ?? source.selectedRingMatchOrderDisplayIds
      ?? []
    ),
  };
}

function normalizeProfileDisplaySnapshots(values) {
  if (!Array.isArray(values)) return [];
  const seen = new Set();
  return values
    .map((value) => {
      if (!value || typeof value !== 'object') return null;
      const id = normalizeDisplayId(value.id);
      const label = typeof value.label === 'string' ? value.label.trim() : '';
      if (!id || !label) return null;
      return { id, label };
    })
    .filter((value) => {
      if (!value || seen.has(value.id)) return false;
      seen.add(value.id);
      return true;
    });
}

function normalizeDisplaySnapshotsByRole(value) {
  const source = value && typeof value === 'object' ? value : {};
  return {
    scoreboard: normalizeProfileDisplaySnapshots(
      source.scoreboard
      ?? source.selectedDisplaySnapshots
      ?? []
    ),
    ring_match_order: normalizeProfileDisplaySnapshots(
      source.ring_match_order
      ?? source.ringMatchOrderDisplaySnapshots
      ?? []
    ),
  };
}

function normalizeProfile(value) {
  if (!value || typeof value !== 'object') return null;

  const name = typeof value.name === 'string' ? value.name.trim() : '';
  if (!name) return null;

  const id = typeof value.id === 'string' && value.id.trim()
    ? value.id.trim()
    : `profile_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;

  const selectedDisplayIdsByRole = normalizeDisplayIdsByRole(
    value.selectedDisplayIdsByRole ?? value
  );
  const selectedDisplaySnapshotsByRole = normalizeDisplaySnapshotsByRole(
    value.selectedDisplaySnapshotsByRole ?? value
  );

  return {
    id,
    name,
    scoreboardOutputMode: value.scoreboardOutputMode === 'broadcast' ? 'broadcast' : 'single',
    selectedScoreboardDisplayIds: selectedDisplayIdsByRole.scoreboard,
    selectedRingMatchOrderDisplayIds: selectedDisplayIdsByRole.ring_match_order,
    selectedDisplayIdsByRole,
    selectedDisplaySnapshots: selectedDisplaySnapshotsByRole.scoreboard,
    ringMatchOrderDisplaySnapshots: selectedDisplaySnapshotsByRole.ring_match_order,
    selectedDisplaySnapshotsByRole,
    preferredPrimaryScoreboardDisplayId: normalizeDisplayId(
      value.preferredPrimaryScoreboardDisplayId ?? value.preferredScoreboardDisplayId
    ),
  };
}

function normalizeProfiles(values) {
  if (!Array.isArray(values)) return [];
  const seen = new Set();
  return values
    .map((value) => normalizeProfile(value))
    .filter((value) => {
      if (!value || seen.has(value.id)) return false;
      seen.add(value.id);
      return true;
    });
}

class SettingsStore {
  constructor(appInstance) {
    this.app = appInstance;
    this.filePath = path.join(this.app.getPath('userData'), 'display-settings.json');
    this.state = this.loadState();
  }

  loadState() {
    try {
      if (!fs.existsSync(this.filePath)) {
        return { ...DEFAULT_DISPLAY_SETTINGS };
      }

      const raw = fs.readFileSync(this.filePath, 'utf8');
      const parsed = JSON.parse(raw);

      const selectedScoreboardDisplayIds = normalizeDisplayIds(
        parsed.selectedScoreboardDisplayIds
        ?? (parsed.preferredScoreboardDisplayId ? [parsed.preferredScoreboardDisplayId] : [])
      );
      const selectedRingMatchOrderDisplayIds = normalizeDisplayIds(
        parsed.selectedRingMatchOrderDisplayIds
        ?? parsed.selectedDisplayIdsByRole?.ring_match_order
        ?? []
      );

      return {
        ...DEFAULT_DISPLAY_SETTINGS,
        preferredScoreboardDisplayId: normalizeDisplayId(parsed.preferredScoreboardDisplayId),
        preferredPrimaryScoreboardDisplayId: normalizeDisplayId(
          parsed.preferredPrimaryScoreboardDisplayId ?? parsed.preferredScoreboardDisplayId
        ),
        selectedScoreboardDisplayIds,
        selectedRingMatchOrderDisplayIds,
        scoreboardOutputMode: parsed.scoreboardOutputMode === 'broadcast' ? 'broadcast' : 'single',
        broadcastProfiles: normalizeProfiles(parsed.broadcastProfiles),
        scoreboardFullscreen: parsed.scoreboardFullscreen !== false,
      };
    } catch (error) {
      console.warn('[display-settings] Failed to read settings:', error && error.message ? error.message : String(error));
      return { ...DEFAULT_DISPLAY_SETTINGS };
    }
  }

  saveState() {
    try {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      fs.writeFileSync(this.filePath, JSON.stringify(this.state, null, 2), 'utf8');
    } catch (error) {
      console.warn('[display-settings] Failed to save settings:', error && error.message ? error.message : String(error));
    }
  }

  getDisplaySettings() {
    const selectedDisplayIdsByRole = {
      scoreboard: normalizeDisplayIds(this.state.selectedScoreboardDisplayIds),
      ring_match_order: normalizeDisplayIds(this.state.selectedRingMatchOrderDisplayIds),
    };

    return {
      preferredScoreboardDisplayId: normalizeDisplayId(this.state.preferredScoreboardDisplayId),
      preferredPrimaryScoreboardDisplayId: normalizeDisplayId(
        this.state.preferredPrimaryScoreboardDisplayId ?? this.state.preferredScoreboardDisplayId
      ),
      selectedScoreboardDisplayIds: selectedDisplayIdsByRole.scoreboard,
      selectedRingMatchOrderDisplayIds: selectedDisplayIdsByRole.ring_match_order,
      selectedDisplayIdsByRole,
      scoreboardOutputMode: this.state.scoreboardOutputMode === 'broadcast' ? 'broadcast' : 'single',
      broadcastProfiles: normalizeProfiles(this.state.broadcastProfiles),
      scoreboardFullscreen: this.state.scoreboardFullscreen !== false,
      displayRoles: [...DISPLAY_ROLES],
    };
  }

  updateDisplaySettings(partial) {
    const selectedDisplayIdsByRole = normalizeDisplayIdsByRole(
      partial.selectedDisplayIdsByRole ?? {
        selectedScoreboardDisplayIds: Object.prototype.hasOwnProperty.call(partial, 'selectedScoreboardDisplayIds')
          ? partial.selectedScoreboardDisplayIds
          : this.state.selectedScoreboardDisplayIds,
        selectedRingMatchOrderDisplayIds: Object.prototype.hasOwnProperty.call(partial, 'selectedRingMatchOrderDisplayIds')
          ? partial.selectedRingMatchOrderDisplayIds
          : this.state.selectedRingMatchOrderDisplayIds,
      }
    );

    this.state = {
      ...this.state,
      ...partial,
      preferredScoreboardDisplayId: Object.prototype.hasOwnProperty.call(partial, 'preferredScoreboardDisplayId')
        ? normalizeDisplayId(partial.preferredScoreboardDisplayId)
        : normalizeDisplayId(this.state.preferredScoreboardDisplayId),
      preferredPrimaryScoreboardDisplayId: Object.prototype.hasOwnProperty.call(partial, 'preferredPrimaryScoreboardDisplayId')
        ? normalizeDisplayId(partial.preferredPrimaryScoreboardDisplayId)
        : normalizeDisplayId(this.state.preferredPrimaryScoreboardDisplayId ?? this.state.preferredScoreboardDisplayId),
      selectedScoreboardDisplayIds: selectedDisplayIdsByRole.scoreboard,
      selectedRingMatchOrderDisplayIds: selectedDisplayIdsByRole.ring_match_order,
      scoreboardOutputMode: Object.prototype.hasOwnProperty.call(partial, 'scoreboardOutputMode')
        ? (partial.scoreboardOutputMode === 'broadcast' ? 'broadcast' : 'single')
        : (this.state.scoreboardOutputMode === 'broadcast' ? 'broadcast' : 'single'),
      broadcastProfiles: Object.prototype.hasOwnProperty.call(partial, 'broadcastProfiles')
        ? normalizeProfiles(partial.broadcastProfiles)
        : normalizeProfiles(this.state.broadcastProfiles),
      scoreboardFullscreen: Object.prototype.hasOwnProperty.call(partial, 'scoreboardFullscreen')
        ? partial.scoreboardFullscreen !== false
        : this.state.scoreboardFullscreen !== false,
    };

    this.saveState();
    return this.getDisplaySettings();
  }
}

module.exports = {
  DEFAULT_DISPLAY_SETTINGS,
  DISPLAY_ROLES,
  SettingsStore,
  normalizeDisplayId,
  normalizeDisplayIds,
  normalizeDisplayIdsByRole,
  normalizeProfiles,
};
