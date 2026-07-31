import { INPUT_LABELS, formatFirmwareVersion } from './api.js';
import { state, setState, subscribe } from './state.js';
import { startPoller } from './poller.js';
import { createKnob } from './knob.js';
import { createConfigDialog } from './config.js';

const titleEl = document.getElementById('header-title');
const statusEl = document.getElementById('header-status');
const dotEl = document.getElementById('status-dot');
const settingsBtn = document.getElementById('settings-btn');

const config = createConfigDialog();
const knob = createKnob(document.getElementById('knob-root'));

settingsBtn.addEventListener('click', () => config.open());

function renderHeader() {
  titleEl.textContent = state.title || state.device || 'Luxsin-X9';

  const inputLabel = INPUT_LABELS[state.input] || 'Unknown';
  const format = state.audioFormat ? ` · ${state.audioFormat}` : '';
  const firmwareVersion = formatFirmwareVersion(state.version);
  const firmware = firmwareVersion ? ` · v${firmwareVersion}` : '';
  let statusText = `${inputLabel}${format}${firmware}`;

  if (!state.connected) {
    statusText = state.ip ? 'Unreachable' : 'No device configured';
  }

  statusEl.textContent = statusText;

  dotEl.classList.toggle('online', state.connected);
  dotEl.classList.toggle('offline', !state.connected);
}

subscribe(() => {
  renderHeader();
  knob.syncFromState();
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register(new URL('../sw.js', import.meta.url)).catch(() => {});
}

if (!state.ip) {
  config.open();
} else {
  startPoller();
}

renderHeader();
