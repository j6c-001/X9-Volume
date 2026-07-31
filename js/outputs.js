import { OUTPUT_LABELS } from './api.js';

const OUTPUTS_KEY = 'x9-outputs';

/** Built-in output destination icons (separate from input sources). */
export const OUTPUT_ICONS = [
  { id: 'headphones', label: 'Headphones' },
  { id: 'headphones-closed', label: 'Closed-back headphones' },
  { id: 'earbuds', label: 'Earbuds' },
  { id: 'iem', label: 'In-ear monitors' },
  { id: 'amp', label: 'Amp' },
  { id: 'integrated', label: 'Integrated amp' },
  { id: 'speaker', label: 'Speaker' },
  { id: 'speakers', label: 'Speakers' },
  { id: 'tower', label: 'Floorstanding speakers' },
  { id: 'sub', label: 'Subwoofer' },
];

const ICON_IDS = new Set(OUTPUT_ICONS.map((i) => i.id));

/** Map older shared-icon ids (from early builds) onto the output set. */
const LEGACY_ICON_MAP = {
  xlr: 'amp',
  rca: 'speakers',
  headphones: 'headphones',
  speaker: 'speaker',
  receiver: 'integrated',
  generic: 'amp',
};

const DEFAULT_ICONS = [
  'amp',         // XLR
  'speakers',    // RCA
  'headphones',  // Headphone
  'speakers',    // XLR + RCA
];

const ICON_SVG = {
  headphones: `<path d="M4.5 13v3.5A2.5 2.5 0 0 0 7 19h1.25v-5.5H7A2.5 2.5 0 0 0 4.5 16V13zM19.5 13v3.5A2.5 2.5 0 0 1 17 19h-1.25v-5.5H17a2.5 2.5 0 0 1 2.5 2.5V13z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M4.5 13a7.5 7.5 0 0 1 15 0" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>`,
  'headphones-closed': `<path d="M4 12.5v4A3 3 0 0 0 7 19.5h1.5v-6H7A3 3 0 0 0 4 16.5v-4zM20 12.5v4a3 3 0 0 1-3 3h-1.5v-6H17a3 3 0 0 1 3 3v-4z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M4 12.5a8 8 0 0 1 16 0" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/><path d="M9.5 19.5h5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,
  earbuds: `<path d="M8 7.5a2.5 2.5 0 1 1 0 5H7v3.5a1.5 1.5 0 0 1-3 0V12A4.5 4.5 0 0 1 8.5 7.5H8zM16 7.5a2.5 2.5 0 1 0 0 5h1v3.5a1.5 1.5 0 0 0 3 0V12A4.5 4.5 0 0 0 15.5 7.5H16z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M9.5 9.5h5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,
  iem: `<path d="M7 8.5c0-1.5 1.2-2.75 2.75-2.75h.5L14 8.5v2.25l-2.5 1.5V16a2 2 0 0 1-2 2H8.5A1.5 1.5 0 0 1 7 16.5v-8z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M14 9.5c2.2.4 3.75 2.1 3.75 4.25A4.25 4.25 0 0 1 13.5 18" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round"/><circle cx="9.25" cy="11.25" r="1.1" fill="none" stroke="currentColor" stroke-width="1.35"/>`,
  amp: `<rect x="2.5" y="7" width="19" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="1.75"/><circle cx="8" cy="12" r="2.25" fill="none" stroke="currentColor" stroke-width="1.55"/><circle cx="14.25" cy="12" r="2.25" fill="none" stroke="currentColor" stroke-width="1.55"/><path d="M18.25 10v4M20 10v4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,
  integrated: `<rect x="2.5" y="6.5" width="19" height="11" rx="2" fill="none" stroke="currentColor" stroke-width="1.75"/><circle cx="7.5" cy="12" r="2" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="13" cy="12" r="2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M17 9.5h2.5M17 12h2.5M17 14.5h2.5" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round"/>`,
  speaker: `<rect x="6" y="3.5" width="12" height="17" rx="2" fill="none" stroke="currentColor" stroke-width="1.75"/><circle cx="12" cy="13.5" r="3.5" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="7" r="1.25" fill="none" stroke="currentColor" stroke-width="1.35"/>`,
  speakers: `<rect x="2.5" y="5" width="7.5" height="14" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.55"/><circle cx="6.25" cy="13" r="2.1" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="6.25" cy="8" r="0.9" fill="none" stroke="currentColor" stroke-width="1.25"/><rect x="14" y="5" width="7.5" height="14" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.55"/><circle cx="17.75" cy="13" r="2.1" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="17.75" cy="8" r="0.9" fill="none" stroke="currentColor" stroke-width="1.25"/>`,
  tower: `<rect x="8" y="2.5" width="8" height="19" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="12" cy="8" r="1.8" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="12" cy="14" r="2.4" fill="none" stroke="currentColor" stroke-width="1.45"/><path d="M9.5 19.5h5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>`,
  sub: `<rect x="3" y="6" width="18" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.75"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="1.4" fill="none" stroke="currentColor" stroke-width="1.35"/><path d="M18.5 9.5v5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>`,
};

function stockLabel(index) {
  return OUTPUT_LABELS[index] || `Output ${index}`;
}

function resolveIconId(rawIcon, fallback) {
  if (ICON_IDS.has(rawIcon)) return rawIcon;
  if (rawIcon && LEGACY_ICON_MAP[rawIcon]) return LEGACY_ICON_MAP[rawIcon];
  return fallback;
}

function defaultEntry(index) {
  return {
    index,
    enabled: true,
    label: '',
    icon: DEFAULT_ICONS[index] || 'amp',
  };
}

export function defaultOutputConfig() {
  return OUTPUT_LABELS.map((_, index) => defaultEntry(index));
}

function normalizeEntry(raw, index) {
  const base = defaultEntry(index);
  if (!raw || typeof raw !== 'object') return base;
  const label = typeof raw.label === 'string' ? raw.label.trim().slice(0, 24) : '';
  return {
    index,
    enabled: raw.enabled !== false,
    label,
    icon: resolveIconId(raw.icon, base.icon),
  };
}

export function getOutputConfig() {
  try {
    const raw = localStorage.getItem(OUTPUTS_KEY);
    if (!raw) return defaultOutputConfig();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return defaultOutputConfig();
    return OUTPUT_LABELS.map((_, index) => normalizeEntry(parsed[index], index));
  } catch (_) {
    return defaultOutputConfig();
  }
}

export function saveOutputConfig(config) {
  const normalized = OUTPUT_LABELS.map((_, index) => normalizeEntry(config?.[index], index));
  localStorage.setItem(OUTPUTS_KEY, JSON.stringify(normalized));
  return normalized;
}

/** Resolved display fields for a device output index. */
export function resolveOutput(index, config = getOutputConfig()) {
  const idx = Math.max(0, Math.min(OUTPUT_LABELS.length - 1, index | 0));
  const entry = config[idx] || defaultEntry(idx);
  const stock = stockLabel(idx);
  const icon = resolveIconId(entry.icon, DEFAULT_ICONS[idx] || 'amp');
  return {
    index: idx,
    enabled: entry.enabled !== false,
    label: entry.label || stock,
    stockLabel: stock,
    icon,
  };
}

/** Outputs shown in the main selector (enabled, plus current if disabled). */
export function visibleOutputs(currentOutput, config = getOutputConfig()) {
  const current = currentOutput | 0;
  return config
    .map((_, index) => resolveOutput(index, config))
    .filter((o) => o.enabled || o.index === current);
}

export function outputIconSvg(iconId, size = 20) {
  const id = resolveIconId(iconId, 'amp');
  const body = ICON_SVG[id] || ICON_SVG.amp;
  return `<svg class="source-icon" viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true">${body}</svg>`;
}
