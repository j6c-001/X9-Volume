import { getId, syncData, isValidIp, canReachDevice } from './api.js';
import { state, setState } from './state.js';
import { resetPoller } from './poller.js';

export function createConfigDialog() {
  const overlay = document.getElementById('config-overlay');
  const form = document.getElementById('config-form');
  const input = document.getElementById('config-ip');
  const error = document.getElementById('config-error');
  const cancelBtn = document.getElementById('config-cancel');

  function open() {
    input.value = state.ip;
    error.textContent = '';
    overlay.hidden = false;
    input.focus();
  }

  function close() {
    overlay.hidden = true;
    error.textContent = '';
  }

  cancelBtn.addEventListener('click', () => close());

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const ip = input.value.trim();
    if (!isValidIp(ip)) {
      error.textContent = 'Enter a valid IP address or hostname.';
      return;
    }

    if (!canReachDevice()) {
      error.textContent = 'Device control requires opening this app over HTTP on your LAN. HTTPS pages cannot reach the X9 API.';
      return;
    }

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
