/**
 * Soft max volume ceiling and loud-zone helpers.
 * Ceiling is stored in dB (−60 … 0). Default −20 dB.
 */

const STORAGE_KEY = 'x9-max-volume-db';

/** Absolute device range. */
export const VOLUME_DB_FLOOR = -100;
export const VOLUME_DB_CEILING = 0;

/** How high the user may set the soft max. */
export const MAX_VOLUME_SETTING_MIN = -60;
export const MAX_VOLUME_SETTING_MAX = 0;

/** Safe default for new installs / unset pref. */
export const DEFAULT_MAX_VOLUME_DB = -20;

/**
 * Width of the loud zone below the soft max where resistance + re-grab apply.
 * Crossing into this zone upward requires releasing and grabbing again.
 */
export const LOUD_ZONE_DB = 12;

/** Finger rotation multiplier inside the loud zone (higher = slower / stiffer). */
export const LOUD_ZONE_GEAR = 3;

export function clampMaxVolumeDb(db) {
  const n = Number(db);
  if (!Number.isFinite(n)) return DEFAULT_MAX_VOLUME_DB;
  return Math.max(MAX_VOLUME_SETTING_MIN, Math.min(MAX_VOLUME_SETTING_MAX, Math.round(n)));
}

export function getMaxVolumeDb() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === null || raw === '') return DEFAULT_MAX_VOLUME_DB;
  return clampMaxVolumeDb(raw);
}

export function saveMaxVolumeDb(db) {
  const next = clampMaxVolumeDb(db);
  localStorage.setItem(STORAGE_KEY, String(next));
  return next;
}

export function formatVolumeDb(db) {
  const n = Number(db);
  if (!Number.isFinite(n)) return '—';
  if (n === 0) return '0 dB';
  return `${n.toFixed(Number.isInteger(n) ? 0 : 1)} dB`;
}

/** dB at which upward travel latches until the next grab. */
export function getLoudGateDb(maxDb = getMaxVolumeDb()) {
  const max = clampMaxVolumeDb(maxDb);
  return Math.max(VOLUME_DB_FLOOR, max - LOUD_ZONE_DB);
}

export function isInLoudZone(db, maxDb = getMaxVolumeDb()) {
  return db >= getLoudGateDb(maxDb) - 1e-6;
}
