import { getId, syncData, isValidIp } from './api.js';
import { state, setState } from './state.js';
import { resetPoller } from './poller.js';
import { APP_VERSION } from './version.js';
import { KNOB_COLORS, getKnobColor, applyKnobColor, saveKnobColor } from './theme.js';

export function createConfigDialog() {
  const overlay = document.getElementById('config-overlay');
  const form = document.getElementById('config-form');
  const input = document.getElementById('config-ip');
  const colorInput = document.getElementById('config-color');
  const swatchesRoot = document.getElementById('config-swatches');
  const error = document.getElementById('config-error');
  const cancelBtn = document.getElementById('config-cancel');
  const versionEl = document.getElementById('config-version');
  let draftColor = getKnobColor();
  let savedColorOnOpen = draftColor;

  versionEl.textContent = `App v${APP_VERSION}`;

  for (const swatch of KNOB_COLORS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'config-swatch';
    btn.style.setProperty('--swatch', swatch.hex);
    btn.title = swatch.label;
    btn.setAttribute('aria-label', swatch.label);
    btn.dataset.color = swatch.hex;
    btn.addEventListener('click', () => {
      draftColor = swatch.hex;
      colorInput.value = swatch.hex;
      applyKnobColor(draftColor);
      syncSwatchActive();
    });
    swatchesRoot.insertBefore(btn, colorInput);
  }

  function syncSwatchActive() {
    for (const btn of swatchesRoot.querySelectorAll('.config-swatch')) {
      btn.classList.toggle('is-active', btn.dataset.color === draftColor);
    }
  }

  function open() {
    input.value = state.ip;
    draftColor = getKnobColor();
    savedColorOnOpen = draftColor;
    colorInput.value = draftColor;
    applyKnobColor(draftColor);
    syncSwatchActive();
    error.textContent = '';
    overlay.hidden = false;
    input.focus();
  }

  function close() {
    overlay.hidden = true;
    error.textContent = '';
  }

  cancelBtn.addEventListener('click', () => {
    applyKnobColor(savedColorOnOpen);
    close();
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      applyKnobColor(getKnobColor());
      close();
    }
  });

  colorInput.addEventListener('input', () => {
    draftColor = colorInput.value;
    applyKnobColor(draftColor);
    syncSwatchActive();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const ip = input.value.trim();
    if (!isValidIp(ip)) {
      error.textContent = 'Enter a valid IP address or hostname.';
      return;
    }

    saveKnobColor(draftColor);
    savedColorOnOpen = draftColor;

    error.textContent = 'Connecting…';
    try {
      const ctrl = new AbortController();
      await getId(ip, ctrl.signal);
      const data = await syncData(ip, ctrl.signal);
      localStorage.setItem('x9-device-ip', ip);
      setState({
        ip,
        failures: 0,
        connected: true,
      });
      setState({
        device: data.device || 'Luxsin-X9',
        title: data.input === 4 && data.bt_title ? data.bt_title : (data.device || 'Luxsin-X9'),
        input: data.input ?? 0,
        audioFormat: data.audioFormat || '',
        version: data.version ?? '',
        volume: data.volume ?? 100,
        soundStep: data.soundStep ?? 0,
        muted: !!data.isDacMetuVolume,
      });
      resetPoller();
      close();
    } catch (_) {
      error.textContent = 'Could not reach device. Check IP and LAN connection.';
    }
  });

  return { open, close };
}
