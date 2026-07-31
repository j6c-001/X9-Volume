import { formatFirmwareVersion } from './api.js';
import { state, subscribe } from './state.js';
import { startPoller } from './poller.js';
import { createKnob } from './knob.js';
import { createConfigDialog } from './config.js';
import { createIoSelector } from './io-selector.js';
import { createVuSelector } from './vu.js';
import { resolveSource } from './sources.js';
import { resolveOutput } from './outputs.js';
import { applyKnobColor, getKnobColor } from './theme.js';
import { registerServiceWorker } from './update.js';

applyKnobColor(getKnobColor());

const titleEl = document.getElementById('header-title');
const statusEl = document.getElementById('header-status');
const dotEl = document.getElementById('status-dot');
const settingsBtn = document.getElementById('settings-btn');

const io = createIoSelector(document.getElementById('io-root'));
const vu = createVuSelector(document.getElementById('vu-root'));
const config = createConfigDialog({
  onSourcesChanged: () => io.render(),
  onOutputsChanged: () => io.render(),
  onVuVisibilityChanged: () => vu.render(),
});
const knob = createKnob(document.getElementById('knob-root'));

settingsBtn.addEventListener('click', () => {
  vu.close();
  io.closePicker();
  config.open();
});

function renderHeader() {
  titleEl.textContent = state.title || state.device || 'Luxsin-X9';

  const inputLabel = resolveSource(state.input).label;
  const outputLabel = resolveOutput(state.output).label;
  const format = state.audioFormat ? ` · ${state.audioFormat}` : '';
  const firmwareVersion = formatFirmwareVersion(state.version);
  const firmware = firmwareVersion ? ` · v${firmwareVersion}` : '';
  let statusText = `${inputLabel} → ${outputLabel}${format}${firmware}`;

  if (!state.connected) {
    statusText = state.ip ? 'Unreachable' : 'No device configured';
  }

  statusEl.textContent = statusText;

  dotEl.classList.toggle('online', state.connected);
  dotEl.classList.toggle('offline', !state.connected);
}

subscribe(() => {
  renderHeader();
  io.render();
  vu.render();
  knob.syncFromState();
});

registerServiceWorker().catch(() => {});

if (!state.ip) {
  config.open();
} else {
  startPoller();
}

renderHeader();
io.render();
vu.render();
