import { decodeCustomBase64 } from './codec.js';

export const INPUT_LABELS = [
  'USB-B', 'USB-C', 'Coaxial', 'Optical',
  'Bluetooth', 'HDMI-EARC', 'RCA', 'USB Driver',
];

// Device soundStep 0..3 → 0.5, 1, 2, 3 dB per relay step (API volume units are 0.5 dB)
export const VOLUME_STEP_UNITS = [1, 2, 4, 6];

export function getVolumeStepUnits(soundStep) {
  const idx = Math.max(0, Math.min(3, soundStep | 0));
  return VOLUME_STEP_UNITS[idx];
}

export function snapVolume(volume, soundStep) {
  const step = getVolumeStepUnits(soundStep);
  const clamped = Math.max(0, Math.min(200, volume));
  return Math.round(clamped / step) * step;
}

export function toDb(volume) {
  return volume / 2 - 100;
}

export function toVolume(db, soundStep = 0) {
  const raw = Math.round((db + 100) * 2);
  return snapVolume(raw, soundStep);
}

function parseVersionNumber(value) {
  if (value == null) return 0;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const text = String(value).trim();
  if (!text) return 0;
  const direct = Number(text);
  if (Number.isFinite(direct)) return direct;
  const digits = text.match(/\d+/g);
  return digits?.length ? Number(digits[digits.length - 1]) : 0;
}

export function formatFirmwareVersion(value) {
  if (value == null || String(value).trim() === '') return '';
  const n = parseVersionNumber(value);
  if (!n) return String(value);
  return `${Math.floor(n / 1000)}.${Math.floor((n % 1000) / 100)}.0.${n % 10}`;
}

export function deviceFetch(ip, path, options = {}) {
  const url = `http://${ip}${path}`;
  return fetch(url, {
    method: 'GET',
    mode: 'cors',
    credentials: 'omit',
    ...options,
  });
}

export async function getMsgCount(ip, signal) {
  const res = await deviceFetch(ip, '/msgCount', { signal });
  if (!res.ok) throw new Error('msgCount failed');
  const n = parseInt(await res.text(), 10);
  if (Number.isNaN(n)) throw new Error('invalid msgCount');
  return n;
}

export async function syncData(ip, signal) {
  const res = await deviceFetch(ip, '/dev/info.cgi?action=syncData', { signal });
  if (!res.ok) throw new Error('syncData failed');
  return decodeCustomBase64(await res.text());
}

export async function getId(ip, signal) {
  const res = await deviceFetch(ip, '/dev/info.cgi?action=getId', { signal });
  if (!res.ok) throw new Error('getId failed');
  return res.json();
}

export async function setVolume(ip, volume) {
  const res = await deviceFetch(ip, `/dev/info.cgi?action=setting&volume=${volume}`);
  return res.ok;
}

export async function toggleMute(ip) {
  const res = await deviceFetch(ip, '/dev/info.cgi?action=setting&isDacMetuVolume=1');
  return res.ok;
}

export async function setInput(ip, index) {
  const n = Math.max(0, Math.min(7, index | 0));
  const res = await deviceFetch(ip, `/dev/info.cgi?action=setting&input=${n}`);
  return res.ok;
}

export function isValidIp(value) {
  const v = value.trim();
  if (!v) return false;
  const ipv4 = /^(?:\d{1,3}\.){3}\d{1,3}$/;
  const host = /^[a-zA-Z0-9][a-zA-Z0-9.-]*[a-zA-Z0-9]$|^[a-zA-Z0-9]$/;
  if (ipv4.test(v)) {
    return v.split('.').every((n) => {
      const x = Number(n);
      return x >= 0 && x <= 255;
    });
  }
  return host.test(v);
}
