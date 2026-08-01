import { formatFirmwareVersion } from './api.js';
import { state, subscribe } from './state.js';
import { startPoller } from './poller.js';
import { createKnob } from './knob.js';
import { createConfigDialog } from './config.js';
import { createIoSelector } from './io-selector.js';
import { createGainControl } from './gain.js';
import { createVuSelector } from './vu.js';
import { applyKnobColor, getKnobColor } from './theme.js';
import { registerServiceWorker } from './update.js';

applyKnobColor(getKnobColor());

const titleEl = document.getElementById('header-title');
const firmwareEl = document.getElementById('header-firmware');
const dotEl = document.getElementById('status-dot');
const settingsBtn = document.getElementById('settings-btn');

const io = createIoSelector(document.getElementById('io-root'));
const gain = createGainControl(document.getElementById('gain-root'));
const vu = createVuSelector(document.getElementById('vu-root'));
const knob = createKnob(document.getElementById('knob-root'));
const config = createConfigDialog({
  onSourcesChanged: () => io.render(),
  onOutputsChanged: () => io.render(),
  onVuVisibilityChanged: () => vu.render(),
  onMaxVolumeChanged: () => knob.syncFromState(),
});

settingsBtn.addEventListener('click', () => {
  vu.close();
  io.closePicker();
  config.open();
});

function renderHeader() {
  titleEl.textContent = state.title || state.device || 'Luxsin-X9';

  const firmwareVersion = formatFirmwareVersion(state.version);
  let firmwareText = '';
  if (state.connected && firmwareVersion) {
    firmwareText = `v${firmwareVersion}`;
  } else if (!state.connected && state.ip) {
    firmwareText = 'Offline';
  }

  firmwareEl.textContent = firmwareText;
  firmwareEl.hidden = !firmwareText;
  firmwareEl.classList.toggle('is-offline', !state.connected && !!state.ip);

  dotEl.classList.toggle('online', state.connected);
  dotEl.classList.toggle('offline', !state.connected);
}

subscribe(() => {
  renderHeader();
  io.render();
  gain.render();
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
gain.render();
vu.render();
