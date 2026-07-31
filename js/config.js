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

export function createConfigDialog({ onSourcesChanged } = {}) {
  const overlay = document.getElementById('config-overlay');
  const form = document.getElementById('config-form');
  const input = document.getElementById('config-ip');
  const colorInput = document.getElementById('config-color');
  const swatchesRoot = document.getElementById('config-swatches');
  const sourcesRoot = document.getElementById('config-sources');
  const iconOnlyInput = document.getElementById('config-source-icon-only');
  const error = document.getElementById('config-error');
  const cancelBtn = document.getElementById('config-cancel');
  const versionEl = document.getElementById('config-version');
  let draftColor = getKnobColor();
  let savedColorOnOpen = draftColor;
  let draftSources = getSourceConfig();
  let draftIconOnly = getSourceIconOnly();

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

  function renderSourcesEditor() {
    sourcesRoot.replaceChildren();
    for (const entry of draftSources) {
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
        draftSources[entry.index] = {
          ...draftSources[entry.index],
          enabled: checkbox.checked,
        };
        row.classList.toggle('is-disabled', !checkbox.checked);
      });
      row.classList.toggle('is-disabled', !entry.enabled);

      labelInput.addEventListener('input', () => {
        draftSources[entry.index] = {
          ...draftSources[entry.index],
          label: labelInput.value.trim().slice(0, 24),
        };
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
          draftSources[entry.index] = {
            ...draftSources[entry.index],
            icon: icon.id,
          };
          for (const b of iconsRoot.querySelectorAll('.config-source-icon-btn')) {
            b.classList.toggle('is-active', b.dataset.icon === icon.id);
          }
        });
        iconsRoot.appendChild(btn);
      }

      sourcesRoot.appendChild(row);
    }
  }

  function open() {
    input.value = state.ip;
    draftColor = getKnobColor();
    savedColorOnOpen = draftColor;
    colorInput.value = draftColor;
    applyKnobColor(draftColor);
    syncSwatchActive();
    draftSources = getSourceConfig().map((s) => ({ ...s }));
    draftIconOnly = getSourceIconOnly();
    iconOnlyInput.checked = draftIconOnly;
    renderSourcesEditor();
    error.textContent = '';
    overlay.hidden = false;
    input.focus();
  }

  iconOnlyInput.addEventListener('change', () => {
    draftIconOnly = iconOnlyInput.checked;
  });

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
    saveSourceConfig(draftSources);
    saveSourceIconOnly(draftIconOnly);
    onSourcesChanged?.();

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
