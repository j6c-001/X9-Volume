import { INPUT_LABELS } from './api.js';

const SOURCES_KEY = 'x9-sources';

/** Built-in icon ids available in Settings and the main selector. */
export const SOURCE_ICONS = [
  { id: 'usb', label: 'USB' },
  { id: 'coax', label: 'Coaxial' },
  { id: 'optical', label: 'Optical' },
  { id: 'bluetooth', label: 'Bluetooth' },
  { id: 'hdmi', label: 'HDMI' },
  { id: 'rca', label: 'RCA' },
  { id: 'streamer', label: 'Streamer' },
  { id: 'generic', label: 'Generic' },
];

const ICON_IDS = new Set(SOURCE_ICONS.map((i) => i.id));

const DEFAULT_ICONS = [
  'usb',       // USB-B
  'usb',       // USB-C
  'coax',      // Coaxial
  'optical',   // Optical
  'bluetooth', // Bluetooth
  'hdmi',      // HDMI-EARC
  'rca',       // RCA
  'generic',   // USB Driver
];

/** Inline SVG markup (24×24 viewBox) for each built-in icon. */
const ICON_SVG = {
  usb: `<path d="M8 2v8H6.5a1.5 1.5 0 0 0 0 3H8v5.5a2.5 2.5 0 0 0 5 0V13h1.5a1.5 1.5 0 0 0 0-3H13V2h-2v8h-1V2H8z"/><circle cx="9.5" cy="18.5" r="1.2"/><circle cx="12.5" cy="18.5" r="1.2"/>`,
  coax: `<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.75"/><circle cx="12" cy="12" r="3.25" fill="none" stroke="currentColor" stroke-width="1.75"/><circle cx="12" cy="12" r="1.1"/>`,
  optical: `<path d="M4 12h3l2-5 3 10 2-5h6" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/><circle cx="19" cy="12" r="1.4"/>`,
  bluetooth: `<path d="M7 7.5 17 16.5 12 21V3l5 4.5L7 16.5" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>`,
  hdmi: `<path d="M3 9.5h18v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5z" fill="none" stroke="currentColor" stroke-width="1.75"/><path d="M7 9.5V8h10v1.5M8.5 14.5h1M11.5 14.5h1M14.5 14.5h1" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,
  rca: `<circle cx="8" cy="12" r="3.25" fill="none" stroke="currentColor" stroke-width="1.75"/><circle cx="16" cy="12" r="3.25" fill="none" stroke="currentColor" stroke-width="1.75"/><circle cx="8" cy="12" r="1"/><circle cx="16" cy="12" r="1"/>`,
  streamer: `<rect x="3.5" y="7" width="17" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="1.75"/><path d="M8 12h.01M12 12h.01M16 12h.01" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><path d="M7 17v2h10v-2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,
  generic: `<path d="M4 8.5 12 4l8 4.5v7L12 20l-8-4.5v-7z" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round"/><path d="M12 12v8M4 8.5l8 3.5 8-3.5" fill="none" stroke="currentColor" stroke-width="1.5"/>`,
};

function stockLabel(index) {
  return INPUT_LABELS[index] || `Input ${index}`;
}

function defaultEntry(index) {
  return {
    index,
    enabled: true,
    label: '',
    icon: DEFAULT_ICONS[index] || 'generic',
  };
}

export function defaultSourceConfig() {
  return INPUT_LABELS.map((_, index) => defaultEntry(index));
}

function normalizeEntry(raw, index) {
  const base = defaultEntry(index);
  if (!raw || typeof raw !== 'object') return base;
  const label = typeof raw.label === 'string' ? raw.label.trim().slice(0, 24) : '';
  const icon = ICON_IDS.has(raw.icon) ? raw.icon : base.icon;
  return {
    index,
    enabled: raw.enabled !== false,
    label,
    icon,
  };
}

export function getSourceConfig() {
  try {
    const raw = localStorage.getItem(SOURCES_KEY);
    if (!raw) return defaultSourceConfig();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return defaultSourceConfig();
    return INPUT_LABELS.map((_, index) => normalizeEntry(parsed[index], index));
  } catch (_) {
    return defaultSourceConfig();
  }
}

export function saveSourceConfig(config) {
  const normalized = INPUT_LABELS.map((_, index) => normalizeEntry(config?.[index], index));
  localStorage.setItem(SOURCES_KEY, JSON.stringify(normalized));
  return normalized;
}

/** Resolved display fields for a device input index. */
export function resolveSource(index, config = getSourceConfig()) {
  const idx = Math.max(0, Math.min(INPUT_LABELS.length - 1, index | 0));
  const entry = config[idx] || defaultEntry(idx);
  const stock = stockLabel(idx);
  return {
    index: idx,
    enabled: entry.enabled !== false,
    label: entry.label || stock,
    stockLabel: stock,
    icon: ICON_IDS.has(entry.icon) ? entry.icon : (DEFAULT_ICONS[idx] || 'generic'),
  };
}

/** Sources shown in the main selector (enabled, plus current if disabled). */
export function visibleSources(currentInput, config = getSourceConfig()) {
  const current = currentInput | 0;
  return config
    .map((_, index) => resolveSource(index, config))
    .filter((s) => s.enabled || s.index === current);
}

export function sourceIconSvg(iconId, size = 20) {
  const id = ICON_IDS.has(iconId) ? iconId : 'generic';
  const body = ICON_SVG[id] || ICON_SVG.generic;
  return `<svg class="source-icon" viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true">${body}</svg>`;
}
