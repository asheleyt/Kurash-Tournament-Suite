const { screen } = require('electron');
const { normalizeDisplayId } = require('./settings-store');

function cloneBounds(bounds) {
  return {
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
  };
}

function getDisplayLabel(display, index, primaryId) {
  const fallback = `Display ${index + 1}`;
  const rawLabel = typeof display.label === 'string' ? display.label.trim() : '';
  const label = rawLabel || fallback;

  if (normalizeDisplayId(display.id) === primaryId) {
    return label.includes('(Main)') ? label : `${label} (Main)`;
  }

  return label;
}

function serializeDisplay(display, index, primaryId, activeScoreboardTargetId) {
  const id = normalizeDisplayId(display.id);

  return {
    id,
    label: getDisplayLabel(display, index, primaryId),
    bounds: cloneBounds(display.bounds),
    workArea: cloneBounds(display.workArea),
    scaleFactor: display.scaleFactor,
    rotation: display.rotation,
    touchSupport: display.touchSupport,
    internal: !!display.internal,
    isPrimary: id === primaryId,
    isExternal: id !== primaryId,
    isScoreboardTarget: id === normalizeDisplayId(activeScoreboardTargetId),
  };
}

class DisplayManager {
  getPrimaryDisplay() {
    return screen.getPrimaryDisplay();
  }

  getAllDisplays(activeScoreboardTargetId = null) {
    const primaryId = normalizeDisplayId(this.getPrimaryDisplay().id);

    return screen.getAllDisplays().map((display, index) =>
      serializeDisplay(display, index, primaryId, activeScoreboardTargetId)
    );
  }

  getSecondaryDisplays() {
    const primaryId = normalizeDisplayId(this.getPrimaryDisplay().id);
    return screen.getAllDisplays().filter((display) => normalizeDisplayId(display.id) !== primaryId);
  }

  getDisplayById(id) {
    const normalizedId = normalizeDisplayId(id);
    if (!normalizedId) return null;

    return screen.getAllDisplays().find((display) => normalizeDisplayId(display.id) === normalizedId) || null;
  }

  getBestScoreboardDisplay(savedId = null) {
    return this.getDisplayById(savedId) || this.getSecondaryDisplays()[0] || this.getPrimaryDisplay();
  }

  getDisplayForBounds(bounds) {
    if (!bounds) return this.getPrimaryDisplay();
    return screen.getDisplayMatching(bounds);
  }

  getDisplayForWindow(win) {
    if (!win || win.isDestroyed()) return this.getPrimaryDisplay();
    return this.getDisplayForBounds(win.getBounds());
  }
}

module.exports = {
  DisplayManager,
  cloneBounds,
};
