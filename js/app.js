import { INPUT_LABELS, powerOff } from './api.js';
import { state, setState, subscribe, haptic } from './state.js';
import { startPoller, resetPoller } from './poller.js';
import { createKnob } from './knob.js';
import { createConfigDialog } from './config.js';

const titleEl = document.getElementById('header-title');
const statusEl = document.getElementById('header-status');
const dotEl = document.getElementById('status-dot');
const powerBtn = document.getElementById('power-toggle');
const settingsBtn = document.getElementById('settings-btn');

const config = createConfigDialog();
const knob = createKnob(document.getElementById('knob-root'));

settingsBtn.addEventListener('click', () => config.open());

powerBtn.addEventListener('click', async () => {
  if (state.poweredOff || !state.connected) {
    setState({ poweredOff: false, failures: 0 });
    resetPoller();
    return;
  }
  if (!state.ip) return;

  haptic();
  setState({ poweringOff: true, poweredOff: true, connected: false });

  try {
    await powerOff(state.ip);
  } catch (_) {
    /* device may drop connection before response */
  } finally {
    setState({ poweringOff: false });
  }
});

function renderHeader() {
  titleEl.textContent = state.title || state.device || 'Luxsin-X9';

  const inputLabel = INPUT_LABELS[state.input] || 'Unknown';
  const format = state.audioFormat ? ` · ${state.audioFormat}` : '';
  let statusText = `${inputLabel}${format}`;

  if (state.poweredOff) {
    statusText = 'Powered off';
  } else if (!state.connected) {
    statusText = state.ip ? 'Unreachable' : 'No device configured';
  }

  statusEl.textContent = statusText;

  dotEl.classList.toggle('online', state.connected && !state.poweredOff);
  dotEl.classList.toggle('offline', !state.connected || state.poweredOff);

  const on = state.connected && !state.poweredOff;
  powerBtn.classList.toggle('is-on', on);
  powerBtn.classList.toggle('is-off', !on);
  powerBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
  powerBtn.setAttribute('aria-label', on ? 'Power off device' : 'Device off — tap to reconnect');
}

subscribe(() => {
  renderHeader();
  knob.syncFromState();
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

if (!state.ip) {
  config.open();
} else {
  startPoller();
}

renderHeader();
