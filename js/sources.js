import { INPUT_LABELS } from './api.js';

const SOURCES_KEY = 'x9-sources';

/** Built-in icon ids available in Settings and the main selector. */
export const SOURCE_ICONS = [
  // Connected devices
  { id: 'tv', label: 'TV' },
  { id: 'streamer', label: 'Streamer' },
  { id: 'computer', label: 'Computer' },
  { id: 'phone', label: 'Phone' },
  { id: 'turntable', label: 'Record player' },
  { id: 'cd', label: 'CD player' },
  { id: 'dac', label: 'DAC' },
  { id: 'receiver', label: 'Receiver' },
  { id: 'speaker', label: 'Speaker' },
  { id: 'game', label: 'Game console' },
  { id: 'radio', label: 'Radio' },
  // Connection / wiring
  { id: 'usb', label: 'USB' },
  { id: 'coax', label: 'Coaxial' },
  { id: 'optical', label: 'Optical' },
  { id: 'bluetooth', label: 'Bluetooth' },
  { id: 'hdmi', label: 'HDMI' },
  { id: 'rca', label: 'RCA' },
  { id: 'generic', label: 'Generic' },
];

const ICON_IDS = new Set(SOURCE_ICONS.map((i) => i.id));

const DEFAULT_ICONS = [
  'computer',  // USB-B
  'computer',  // USB-C
  'cd',        // Coaxial
  'streamer',  // Optical
  'phone',     // Bluetooth
  'tv',        // HDMI-EARC
  'turntable', // RCA
  'dac',       // USB Driver
];

/** Inline SVG markup (24×24 viewBox) for each built-in icon. */
const ICON_SVG = {
  tv: `<rect x="2.5" y="4.5" width="19" height="12.5" rx="1.75" fill="none" stroke="currentColor" stroke-width="1.75"/><path d="M9 20h6M12 17v3" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>`,
  streamer: `<rect x="3.5" y="7" width="17" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="1.75"/><path d="M8 12h.01M12 12h.01M16 12h.01" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><path d="M7 17v2h10v-2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,
  computer: `<rect x="3" y="4.5" width="18" height="12" rx="1.75" fill="none" stroke="currentColor" stroke-width="1.75"/><path d="M8 20h8M10.5 16.5 9.5 20M13.5 16.5l1 3.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,
  phone: `<rect x="7.5" y="2.5" width="9" height="19" rx="2" fill="none" stroke="currentColor" stroke-width="1.75"/><path d="M11 18.5h2" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>`,
  turntable: `<circle cx="11" cy="12" r="7" fill="none" stroke="currentColor" stroke-width="1.75"/><circle cx="11" cy="12" r="2" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="11" cy="12" r="0.9"/><path d="M18 5.5v8.5a1.5 1.5 0 0 1-1.5 1.5H14" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/><circle cx="14" cy="15.5" r="1.1"/>`,
  cd: `<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.75"/><circle cx="12" cy="12" r="2.25" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M12 4v2.5M12 17.5V20M4 12h2.5M17.5 12H20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,
  dac: `<rect x="3" y="7" width="18" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="1.75"/><rect x="6" y="9.5" width="6" height="3" rx="0.75" fill="none" stroke="currentColor" stroke-width="1.35"/><circle cx="15.5" cy="12" r="1.6" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="19" cy="12" r="1.1" fill="none" stroke="currentColor" stroke-width="1.35"/>`,
  receiver: `<rect x="2.5" y="6.5" width="19" height="11" rx="2" fill="none" stroke="currentColor" stroke-width="1.75"/><path d="M6 12h.01M9 12h.01M12 12h.01" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round"/><circle cx="17.5" cy="12" r="2" fill="none" stroke="currentColor" stroke-width="1.5"/>`,
  speaker: `<rect x="6" y="3.5" width="12" height="17" rx="2" fill="none" stroke="currentColor" stroke-width="1.75"/><circle cx="12" cy="13.5" r="3.5" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="7" r="1.25" fill="none" stroke="currentColor" stroke-width="1.35"/>`,
  game: `<path d="M5.5 9.5h13a3 3 0 0 1 3 3v1.5a3.5 3.5 0 0 1-3.5 3.5h-1.2l-1.4 2.2a1 1 0 0 1-1.7 0L12 17.5l-1.7 2.2a1 1 0 0 1-1.7 0L7.2 17.5H6A3.5 3.5 0 0 1 2.5 14v-1.5a3 3 0 0 1 3-3z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M8 12v3M6.5 13.5h3M15.2 12.2h.01M17 13.8h.01" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>`,
  radio: `<path d="M4 9.5h16v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-9z" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round"/><path d="M7 9.5 16 4.5M8.5 14.5h3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="15.5" cy="14.5" r="2" fill="none" stroke="currentColor" stroke-width="1.5"/>`,
  usb: `<path d="M8 2v8H6.5a1.5 1.5 0 0 0 0 3H8v5.5a2.5 2.5 0 0 0 5 0V13h1.5a1.5 1.5 0 0 0 0-3H13V2h-2v8h-1V2H8z"/><circle cx="9.5" cy="18.5" r="1.2"/><circle cx="12.5" cy="18.5" r="1.2"/>`,
  coax: `<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.75"/><circle cx="12" cy="12" r="3.25" fill="none" stroke="currentColor" stroke-width="1.75"/><circle cx="12" cy="12" r="1.1"/>`,
  optical: `<path d="M4 12h3l2-5 3 10 2-5h6" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/><circle cx="19" cy="12" r="1.4"/>`,
  bluetooth: `<path d="M7 7.5 17 16.5 12 21V3l5 4.5L7 16.5" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>`,
  hdmi: `<path d="M3 9.5h18v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5z" fill="none" stroke="currentColor" stroke-width="1.75"/><path d="M7 9.5V8h10v1.5M8.5 14.5h1M11.5 14.5h1M14.5 14.5h1" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,
  rca: `<circle cx="8" cy="12" r="3.25" fill="none" stroke="currentColor" stroke-width="1.75"/><circle cx="16" cy="12" r="3.25" fill="none" stroke="currentColor" stroke-width="1.75"/><circle cx="8" cy="12" r="1"/><circle cx="16" cy="12" r="1"/>`,
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
