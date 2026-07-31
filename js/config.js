import { getId, syncData, isValidIp, INPUT_LABELS } from './api.js';
import { state, setState } from './state.js';
import { resetPoller } from './poller.js';
import { APP_VERSION } from './version.js';
import { KNOB_COLORS, getKnobColor, applyKnobColor, saveKnobColor } from './theme.js';
import {
  SOURCE_ICONS,
  getSourceConfig,
  saveSourceConfig,
  getSourceIconOnly,
  saveSourceIconOnly,
  sourceIconSvg,
} from './sources.js';
import { getShowVuSelector, saveShowVuSelector } from './vu.js';

const PANELS = ['device', 'appearance', 'sources'];

export function createConfigDialog({ onSourcesChanged, onVuVisibilityChanged } = {}) {
  const overlay = document.getElementById('config-overlay');
  const closeBtn = document.getElementById('config-close');
  const input = document.getElementById('config-ip');
  const colorInput = document.getElementById('config-color');
  const swatchesRoot = document.getElementById('config-swatches');
  const sourcesRoot = document.getElementById('config-sources');
  const iconOnlyInput = document.getElementById('config-source-icon-only');
  const showVuInput = document.getElementById('config-show-vu');
  const statusEl = document.getElementById('config-status');
  const versionEl = document.getElementById('config-version');
  const tabs = [...overlay.querySelectorAll('.config-tab')];
  const panels = Object.fromEntries(
    PANELS.map((id) => [id, document.getElementById(`config-panel-${id}`)]),
  );

  let connecting = false;
  let lastTriedIp = '';

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
      colorInput.value = swatch.hex;
      saveKnobColor(swatch.hex);
      syncSwatchActive(swatch.hex);
    });
    swatchesRoot.insertBefore(btn, colorInput);
  }

  function syncSwatchActive(hex = getKnobColor()) {
    for (const btn of swatchesRoot.querySelectorAll('.config-swatch')) {
      btn.classList.toggle('is-active', btn.dataset.color === hex);
    }
  }

  function setPanel(panelId) {
    const next = PANELS.includes(panelId) ? panelId : 'device';
    for (const tab of tabs) {
      const active = tab.dataset.panel === next;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
    }
    for (const id of PANELS) {
      panels[id].hidden = id !== next;
    }
  }

  function persistSources(next) {
    saveSourceConfig(next);
    onSourcesChanged?.();
  }

  function renderSourcesEditor() {
    const sources = getSourceConfig();
    sourcesRoot.replaceChildren();
    for (const entry of sources) {
      const stock = INPUT_LABELS[entry.index] || `Input ${entry.index}`;
      const row = document.createElement('div');
      row.className = 'config-source-row';
      row.dataset.index = String(entry.index);

      const enableId = `source-enable-${entry.index}`;
      const labelId = `source-label-${entry.index}`;

      row.innerHTML = `
        <label class="config-source-enable" for="${enableId}">
          <input type="checkbox" id="${enableId}" ${entry.enabled ? 'checked' : ''}>
          <span class="config-source-stock">${escapeHtml(stock)}</span>
        </label>
        <input
          type="text"
          id="${labelId}"
          class="config-source-label"
          maxlength="24"
          placeholder="${escapeAttr(stock)}"
          value="${escapeAttr(entry.label)}"
          aria-label="Custom label for ${escapeAttr(stock)}"
        >
        <div class="config-source-icons" role="group" aria-label="Icon for ${escapeAttr(stock)}"></div>
      `;

      const checkbox = row.querySelector(`#${enableId}`);
      const labelInput = row.querySelector(`#${labelId}`);
      const iconsRoot = row.querySelector('.config-source-icons');

      checkbox.addEventListener('change', () => {
        const next = getSourceConfig();
        next[entry.index] = { ...next[entry.index], enabled: checkbox.checked };
        persistSources(next);
        row.classList.toggle('is-disabled', !checkbox.checked);
      });
      row.classList.toggle('is-disabled', !entry.enabled);

      labelInput.addEventListener('input', () => {
        const next = getSourceConfig();
        next[entry.index] = {
          ...next[entry.index],
          label: labelInput.value.trim().slice(0, 24),
        };
        persistSources(next);
      });

      for (const icon of SOURCE_ICONS) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'config-source-icon-btn';
        btn.title = icon.label;
        btn.setAttribute('aria-label', icon.label);
        btn.dataset.icon = icon.id;
        btn.innerHTML = sourceIconSvg(icon.id, 16);
        if (entry.icon === icon.id) btn.classList.add('is-active');
        btn.addEventListener('click', () => {
          const next = getSourceConfig();
          next[entry.index] = { ...next[entry.index], icon: icon.id };
          persistSources(next);
          for (const b of iconsRoot.querySelectorAll('.config-source-icon-btn')) {
            b.classList.toggle('is-active', b.dataset.icon === icon.id);
          }
        });
        iconsRoot.appendChild(btn);
      }

      sourcesRoot.appendChild(row);
    }
  }

  function setStatus(message, kind = '') {
    statusEl.textContent = message;
    statusEl.classList.toggle('is-error', kind === 'error');
    statusEl.classList.toggle('is-ok', kind === 'ok');
  }

  async function connectDevice({ force = false } = {}) {
    const ip = input.value.trim();
    if (!isValidIp(ip)) {
      setStatus('Enter a valid IP address or hostname.', 'error');
      return false;
    }
    if (connecting) return false;
    if (!force && ip === state.ip && state.connected && ip === lastTriedIp) {
      setStatus('Connected.', 'ok');
      return true;
    }

    connecting = true;
    lastTriedIp = ip;
    setStatus('Connecting…');
    try {
      const ctrl = new AbortController();
      await getId(ip, ctrl.signal);
      const data = await syncData(ip, ctrl.signal);
      localStorage.setItem('x9-device-ip', ip);
      setState({
        ip,
        failures: 0,
        connected: true,
        device: data.device || 'Luxsin-X9',
        title: data.input === 4 && data.bt_title ? data.bt_title : (data.device || 'Luxsin-X9'),
        input: data.input ?? 0,
        audioFormat: data.audioFormat || '',
        version: data.version ?? '',
        volume: data.volume ?? 100,
        soundStep: data.soundStep ?? 0,
        muted: !!data.isDacMetuVolume,
        vu: data.vu != null ? Math.max(0, data.vu | 0) : 0,
        vuCount: data.vu_count != null ? Math.max(1, data.vu_count | 0) : 16,
        selectingVu: false,
      });
      resetPoller();
      setStatus('Connected.', 'ok');
      return true;
    } catch (_) {
      setStatus('Could not reach device. Check IP and LAN connection.', 'error');
      return false;
    } finally {
      connecting = false;
    }
  }

  function open(panel = 'device') {
    input.value = state.ip;
    const color = getKnobColor();
    colorInput.value = color;
    applyKnobColor(color);
    syncSwatchActive(color);
    iconOnlyInput.checked = getSourceIconOnly();
    showVuInput.checked = getShowVuSelector();
    renderSourcesEditor();
    setStatus(state.ip && state.connected ? 'Connected.' : '', state.connected ? 'ok' : '');
    setPanel(state.ip ? panel : 'device');
    overlay.hidden = false;
    if (!state.ip || panel === 'device') input.focus();
  }

  function close() {
    overlay.hidden = true;
    setStatus('');
  }

  for (const tab of tabs) {
    tab.addEventListener('click', () => setPanel(tab.dataset.panel));
  }

  closeBtn.addEventListener('click', close);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  colorInput.addEventListener('input', () => {
    const color = saveKnobColor(colorInput.value);
    syncSwatchActive(color);
  });

  iconOnlyInput.addEventListener('change', () => {
    saveSourceIconOnly(iconOnlyInput.checked);
    onSourcesChanged?.();
  });

  showVuInput.addEventListener('change', () => {
    saveShowVuSelector(showVuInput.checked);
    onVuVisibilityChanged?.();
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      connectDevice({ force: true });
    }
  });

  input.addEventListener('change', () => {
    connectDevice({ force: true });
  });

  return { open, close };
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(text) {
  return escapeHtml(text).replace(/'/g, '&#39;');
}
