import { getId, syncData, isValidIp, INPUT_LABELS, OUTPUT_LABELS } from './api.js';
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
import {
  OUTPUT_ICONS,
  getOutputConfig,
  saveOutputConfig,
  outputIconSvg,
} from './outputs.js';
import { getShowVuSelector, saveShowVuSelector } from './vu.js';
import {
  getMaxVolumeDb,
  saveMaxVolumeDb,
  formatVolumeDb,
  MAX_VOLUME_SETTING_MIN,
  MAX_VOLUME_SETTING_MAX,
} from './volume-limit.js';

const PANELS = ['device', 'appearance', 'sources', 'outputs'];

export function createConfigDialog({
  onSourcesChanged,
  onOutputsChanged,
  onVuVisibilityChanged,
  onMaxVolumeChanged,
} = {}) {
  const overlay = document.getElementById('config-overlay');
  const closeBtn = document.getElementById('config-close');
  const input = document.getElementById('config-ip');
  const colorInput = document.getElementById('config-color');
  const swatchesRoot = document.getElementById('config-swatches');
  const sourcesRoot = document.getElementById('config-sources');
  const outputsRoot = document.getElementById('config-outputs');
  const iconOnlyInput = document.getElementById('config-source-icon-only');
  const showVuInput = document.getElementById('config-show-vu');
  const maxVolumeInput = document.getElementById('config-max-volume');
  const maxVolumeValueEl = document.getElementById('config-max-volume-value');
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

  function syncMaxVolumeUi(db = getMaxVolumeDb()) {
    const next = Math.max(
      MAX_VOLUME_SETTING_MIN,
      Math.min(MAX_VOLUME_SETTING_MAX, Math.round(Number(db) || 0)),
    );
    maxVolumeInput.value = String(next);
    maxVolumeInput.setAttribute('aria-valuenow', String(next));
    maxVolumeValueEl.textContent = formatVolumeDb(next);
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

  function persistOutputs(next) {
    saveOutputConfig(next);
    onOutputsChanged?.();
  }

  function renderIoEditor({
    root,
    entries,
    stockLabels,
    keyPrefix,
    onPersist,
    getConfig,
    icons,
    iconSvg,
  }) {
    root.replaceChildren();
    for (const entry of entries) {
      const stock = stockLabels[entry.index] || `${keyPrefix} ${entry.index}`;
      const row = document.createElement('div');
      row.className = 'config-source-row';
      row.dataset.index = String(entry.index);

      const enableId = `${keyPrefix}-enable-${entry.index}`;
      const labelId = `${keyPrefix}-label-${entry.index}`;

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
        const next = getConfig();
        next[entry.index] = { ...next[entry.index], enabled: checkbox.checked };
        onPersist(next);
        row.classList.toggle('is-disabled', !checkbox.checked);
      });
      row.classList.toggle('is-disabled', !entry.enabled);

      labelInput.addEventListener('input', () => {
        const next = getConfig();
        next[entry.index] = {
          ...next[entry.index],
          label: labelInput.value.trim().slice(0, 24),
        };
        onPersist(next);
      });

      for (const icon of icons) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'config-source-icon-btn';
        btn.title = icon.label;
        btn.setAttribute('aria-label', icon.label);
        btn.dataset.icon = icon.id;
        btn.innerHTML = iconSvg(icon.id, 16);
        if (entry.icon === icon.id) btn.classList.add('is-active');
        btn.addEventListener('click', () => {
          const next = getConfig();
          next[entry.index] = { ...next[entry.index], icon: icon.id };
          onPersist(next);
          for (const b of iconsRoot.querySelectorAll('.config-source-icon-btn')) {
            b.classList.toggle('is-active', b.dataset.icon === icon.id);
          }
        });
        iconsRoot.appendChild(btn);
      }

      root.appendChild(row);
    }
  }

  function renderSourcesEditor() {
    renderIoEditor({
      root: sourcesRoot,
      entries: getSourceConfig(),
      stockLabels: INPUT_LABELS,
      keyPrefix: 'source',
      onPersist: persistSources,
      getConfig: getSourceConfig,
      icons: SOURCE_ICONS,
      iconSvg: sourceIconSvg,
    });
  }

  function renderOutputsEditor() {
    renderIoEditor({
      root: outputsRoot,
      entries: getOutputConfig(),
      stockLabels: OUTPUT_LABELS,
      keyPrefix: 'output',
      onPersist: persistOutputs,
      getConfig: getOutputConfig,
      icons: OUTPUT_ICONS,
      iconSvg: outputIconSvg,
    });
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
        output: data.output != null ? Math.max(0, Math.min(3, data.output | 0)) : 0,
        audioFormat: data.audioFormat || '',
        version: data.version ?? '',
        volume: data.volume ?? 100,
        soundStep: data.soundStep ?? 0,
        dacGain: data.dacGain != null ? Math.max(0, Math.min(3, data.dacGain | 0)) : 0,
        muted: !!data.isDacMetuVolume,
        vu: data.vu != null ? Math.max(0, data.vu | 0) : 0,
        vuCount: data.vu_count != null ? Math.max(1, data.vu_count | 0) : 16,
        vuSensor: data.vuSensor != null ? (data.vuSensor | 0) : 0,
        selectingVu: false,
        selectingIo: false,
        selectingGain: false,
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
    syncMaxVolumeUi();
    renderSourcesEditor();
    renderOutputsEditor();
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
    onOutputsChanged?.();
  });

  showVuInput.addEventListener('change', () => {
    saveShowVuSelector(showVuInput.checked);
    onVuVisibilityChanged?.();
  });

  maxVolumeInput.addEventListener('input', () => {
    const next = saveMaxVolumeDb(maxVolumeInput.value);
    syncMaxVolumeUi(next);
    onMaxVolumeChanged?.(next);
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
