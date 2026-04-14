const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const { safeStorage } = require('electron');

const DEFAULT_CONTROLLER_AUTH_STATE = Object.freeze({
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
});

function cloneValue(value) {
  if (value == null) return value;
  return JSON.parse(JSON.stringify(value));
}

function normalizeText(value) {
  const text = typeof value === 'string' ? value.trim() : String(value ?? '').trim();
  return text || null;
}

function normalizeInteger(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function normalizeScalar(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
  const text = String(value).trim();
  if (!text) return null;
  const maybeNumber = Number(text);
  return Number.isFinite(maybeNumber) && String(Math.trunc(maybeNumber)) === text
    ? Math.trunc(maybeNumber)
    : text;
}

function normalizeAssignment(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return cloneValue(value);
}

function normalizeState(value) {
  const source = value && typeof value === 'object' ? value : {};

  return {
    ...DEFAULT_CONTROLLER_AUTH_STATE,
    device_id: normalizeText(source.device_id),
    token: normalizeText(source.token),
    controller_id: normalizeInteger(source.controller_id),
    controller_name: normalizeText(source.controller_name),
    paired_at: normalizeText(source.paired_at),
    last_paired_host: normalizeText(source.last_paired_host),
    last_snapshot_id: normalizeScalar(source.last_snapshot_id),
    last_assignment: normalizeAssignment(source.last_assignment),
    last_assignment_updated_at: normalizeText(source.last_assignment_updated_at),
    last_assignment_host: normalizeText(source.last_assignment_host),
    last_assignment_snapshot_id: normalizeScalar(source.last_assignment_snapshot_id),
    last_assignment_device_id: normalizeText(source.last_assignment_device_id),
    last_heartbeat_at: normalizeText(source.last_heartbeat_at),
    last_reset_reason: normalizeText(source.last_reset_reason),
  };
}

class ControllerAuthStore {
  constructor(appInstance, logger = console) {
    this.app = appInstance;
    this.logger = logger;
    this.filePath = path.join(this.app.getPath('userData'), 'controller-auth.json');
    this.state = this.loadState();
    this.ensureDeviceId();
  }

  createDeviceId() {
    return `controller-${randomUUID()}`;
  }

  ensureDeviceId() {
    if (this.state.device_id) return false;
    this.state.device_id = this.createDeviceId();
    this.saveState();
    return true;
  }

  loadState() {
    try {
      if (!fs.existsSync(this.filePath)) {
        return normalizeState(DEFAULT_CONTROLLER_AUTH_STATE);
      }

      const raw = fs.readFileSync(this.filePath, 'utf8');
      const parsed = JSON.parse(raw);
      const tokenStorage = normalizeText(parsed.token_storage) || 'plain';
      let token = null;

      if (typeof parsed.token === 'string' && parsed.token.trim()) {
        if (tokenStorage === 'safe_storage' && safeStorage.isEncryptionAvailable()) {
          try {
            token = safeStorage.decryptString(Buffer.from(parsed.token, 'base64'));
          } catch (error) {
            this.logger.warn('[controller-auth] Failed to decrypt stored token. Clearing it.', {
              error: error && error.message ? error.message : String(error),
            });
            token = null;
          }
        } else {
          token = parsed.token;
        }
      }

      return normalizeState({
        ...parsed,
        token,
      });
    } catch (error) {
      this.logger.warn('[controller-auth] Failed to read controller auth state.', {
        error: error && error.message ? error.message : String(error),
      });
      return normalizeState(DEFAULT_CONTROLLER_AUTH_STATE);
    }
  }

  saveState() {
    const normalized = normalizeState(this.state);
    let token = normalized.token;
    let tokenStorage = 'plain';

    if (token && safeStorage.isEncryptionAvailable()) {
      try {
        token = safeStorage.encryptString(token).toString('base64');
        tokenStorage = 'safe_storage';
      } catch (error) {
        this.logger.warn('[controller-auth] Failed to encrypt token; saving plaintext fallback.', {
          error: error && error.message ? error.message : String(error),
        });
      }
    }

    const persisted = {
      ...normalized,
      token,
      token_storage: token ? tokenStorage : 'plain',
    };

    try {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      fs.writeFileSync(this.filePath, JSON.stringify(persisted, null, 2), 'utf8');
    } catch (error) {
      this.logger.warn('[controller-auth] Failed to save controller auth state.', {
        error: error && error.message ? error.message : String(error),
      });
    }
  }

  getState() {
    this.ensureDeviceId();
    const normalized = normalizeState(this.state);
    this.state = normalized;
    return cloneValue(normalized);
  }

  updateState(partial) {
    this.state = normalizeState({
      ...this.state,
      ...(partial && typeof partial === 'object' ? partial : {}),
    });
    this.ensureDeviceId();
    this.saveState();
    return this.getState();
  }

  clearAuth(reason = null) {
    this.state = normalizeState({
      ...this.state,
      token: null,
      last_snapshot_id: null,
      last_assignment: null,
      last_assignment_updated_at: null,
      last_assignment_host: null,
      last_assignment_snapshot_id: null,
      last_assignment_device_id: null,
      last_heartbeat_at: null,
      last_reset_reason: normalizeText(reason),
    });
    this.ensureDeviceId();
    this.saveState();
    return this.getState();
  }
}

module.exports = {
  ControllerAuthStore,
  DEFAULT_CONTROLLER_AUTH_STATE,
};
