const COLOR_KEY = 'x9-knob-color';
const DEFAULT_COLOR = '#d2a06a';

export const KNOB_COLORS = [
  { id: 'copper', hex: '#d2a06a', label: 'Copper' },
  { id: 'gold', hex: '#c9b27a', label: 'Gold' },
  { id: 'ember', hex: '#d4784a', label: 'Ember' },
  { id: 'steel', hex: '#8fa3b5', label: 'Steel' },
  { id: 'jade', hex: '#6a9e8b', label: 'Jade' },
  { id: 'ivory', hex: '#d6d0c4', label: 'Ivory' },
];

function normalizeHex(value) {
  const raw = String(value || '').trim();
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(raw)) {
    const [, a, b, c] = raw;
    return `#${a}${a}${b}${b}${c}${c}`.toLowerCase();
  }
  return DEFAULT_COLOR;
}

function hexToRgba(hex, alpha) {
  const h = normalizeHex(hex).slice(1);
  const n = parseInt(h, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function getKnobColor() {
  return normalizeHex(localStorage.getItem(COLOR_KEY) || DEFAULT_COLOR);
}

export function applyKnobColor(hex) {
  const color = normalizeHex(hex);
  const root = document.documentElement;
  root.style.setProperty('--accent', color);
  root.style.setProperty('--accent-dim', hexToRgba(color, 0.28));
  return color;
}

export function saveKnobColor(hex) {
  const color = applyKnobColor(hex);
  localStorage.setItem(COLOR_KEY, color);
  return color;
}
