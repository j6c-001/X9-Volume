import { OUTPUT_LABELS } from './api.js';
import { SOURCE_ICONS, sourceIconSvg } from './sources.js';

const OUTPUTS_KEY = 'x9-outputs';

const ICON_IDS = new Set(SOURCE_ICONS.map((i) => i.id));

const DEFAULT_ICONS = [
  'xlr',        // XLR
  'rca',        // RCA
  'headphones', // Headphone
  'speaker',    // XLR + RCA
];

function stockLabel(index) {
  return OUTPUT_LABELS[index] || `Output ${index}`;
}

function defaultEntry(index) {
  return {
    index,
    enabled: true,
    label: '',
    icon: DEFAULT_ICONS[index] || 'generic',
  };
}

export function defaultOutputConfig() {
  return OUTPUT_LABELS.map((_, index) => defaultEntry(index));
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
  return {
    index: idx,
    enabled: entry.enabled !== false,
    label: entry.label || stock,
    stockLabel: stock,
    icon: ICON_IDS.has(entry.icon) ? entry.icon : (DEFAULT_ICONS[idx] || 'generic'),
  };
}

/** Outputs shown in the main selector (enabled, plus current if disabled). */
export function visibleOutputs(currentOutput, config = getOutputConfig()) {
  const current = currentOutput | 0;
  return config
    .map((_, index) => resolveOutput(index, config))
    .filter((o) => o.enabled || o.index === current);
}

export { sourceIconSvg as outputIconSvg };
