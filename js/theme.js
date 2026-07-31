const COLOR_KEY = 'x9-knob-color';
const DEFAULT_COLOR = '#5eead4';

export const KNOB_COLORS = [
  { id: 'teal', hex: '#5eead4', label: 'Teal' },
  { id: 'amber', hex: '#f5a524', label: 'Amber' },
  { id: 'rose', hex: '#ff6b8a', label: 'Rose' },
  { id: 'blue', hex: '#6ea8fe', label: 'Blue' },
  { id: 'lime', hex: '#a3e635', label: 'Lime' },
  { id: 'violet', hex: '#c4b5fd', label: 'Violet' },
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
