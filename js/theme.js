const COLOR_KEY = 'x9-knob-color';
const DEFAULT_COLOR = '#c9a66b';

/** Curated accents: clear hue separation, material finishes for dark hi-fi chrome. */
export const KNOB_COLORS = [
  { id: 'champagne', hex: '#c9a66b', label: 'Champagne' },
  { id: 'copper', hex: '#c17a4e', label: 'Copper' },
  { id: 'silver', hex: '#b4bec9', label: 'Silver' },
  { id: 'azure', hex: '#5a8fd1', label: 'Azure' },
  { id: 'oxide', hex: '#c35d4f', label: 'Oxide' },
  { id: 'verdigris', hex: '#3f8f82', label: 'Verdigris' },
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

function hexToRgb(hex) {
  const h = normalizeHex(hex).slice(1);
  const n = parseInt(h, 16);
  return {
    r: (n >> 16) & 255,
    g: (n >> 8) & 255,
    b: n & 255,
  };
}

function hexToRgba(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Relative luminance 0..1 (sRGB). Brighter accents need a softer halo. */
function relativeLuminance(hex) {
  const channel = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function accentDimAlpha(hex) {
  const L = relativeLuminance(hex);
  // Keep dim fills readable without the neon-plastic bloom of a fixed 0.28.
  return Math.max(0.14, Math.min(0.24, 0.26 - L * 0.18));
}

export function getKnobColor() {
  return normalizeHex(localStorage.getItem(COLOR_KEY) || DEFAULT_COLOR);
}

export function applyKnobColor(hex) {
  const color = normalizeHex(hex);
  const root = document.documentElement;
  const dim = accentDimAlpha(color);
  root.style.setProperty('--accent', color);
  root.style.setProperty('--accent-dim', hexToRgba(color, dim));
  root.style.setProperty('--accent-glow', hexToRgba(color, Math.max(0.22, dim + 0.08)));
  return color;
}

export function saveKnobColor(hex) {
  const color = applyKnobColor(hex);
  localStorage.setItem(COLOR_KEY, color);
  return color;
}
