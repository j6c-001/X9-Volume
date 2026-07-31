import { setInput, setOutput } from './api.js';
import { state, setState } from './state.js';
import { hapticImpact } from './haptics.js';
import {
  getSourceConfig,
  getSourceIconOnly,
  visibleSources,
  resolveSource,
  sourceIconSvg,
} from './sources.js';
import {
  getOutputConfig,
  visibleOutputs,
  resolveOutput,
} from './outputs.js';

const ARROW_SVG = `
  <svg class="io-arrow-svg" viewBox="0 0 48 24" width="48" height="24" aria-hidden="true" focusable="false">
    <path class="io-arrow-shaft" d="M4 12h32" fill="none" stroke="currentColor" stroke-linecap="round"/>
    <path class="io-arrow-head" d="M30 5.5 42 12 30 18.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
`;

export function createIoSelector(root) {
  let switching = false;
  let openSide = null; // 'input' | 'output' | null

  root.innerHTML = `
    <div class="io-flow" id="io-flow">
      <button type="button" class="io-endpoint" id="io-input" aria-haspopup="listbox" aria-expanded="false">
        <span class="io-endpoint-icon" id="io-input-icon"></span>
        <span class="io-endpoint-label" id="io-input-label"></span>
      </button>
      <div class="io-arrow" id="io-arrow" aria-hidden="true">${ARROW_SVG}</div>
      <button type="button" class="io-endpoint" id="io-output" aria-haspopup="listbox" aria-expanded="false">
        <span class="io-endpoint-icon" id="io-output-icon"></span>
        <span class="io-endpoint-label" id="io-output-label"></span>
      </button>
    </div>
    <div class="io-picker" id="io-picker" hidden>
      <div class="io-picker-strip" id="io-picker-strip" role="listbox"></div>
    </div>
  `;

  const flow = root.querySelector('#io-flow');
  const inputBtn = root.querySelector('#io-input');
  const outputBtn = root.querySelector('#io-output');
  const inputIcon = root.querySelector('#io-input-icon');
  const outputIcon = root.querySelector('#io-output-icon');
  const inputLabel = root.querySelector('#io-input-label');
  const outputLabel = root.querySelector('#io-output-label');
  const arrow = root.querySelector('#io-arrow');
  const picker = root.querySelector('#io-picker');
  const pickerStrip = root.querySelector('#io-picker-strip');

  function closePicker() {
    openSide = null;
    picker.hidden = true;
    pickerStrip.replaceChildren();
    inputBtn.setAttribute('aria-expanded', 'false');
    outputBtn.setAttribute('aria-expanded', 'false');
    inputBtn.classList.remove('is-open');
    outputBtn.classList.remove('is-open');
  }

  async function selectInput(index) {
    if (!state.ip || !state.connected || switching) return;
    if ((state.input | 0) === (index | 0)) {
      closePicker();
      return;
    }

    switching = true;
    closePicker();
    setState({ input: index, selectingIo: true });
    hapticImpact();

    try {
      await setInput(state.ip, index);
    } catch (_) {
      // Poller will reconcile.
    } finally {
      switching = false;
      setState({ selectingIo: false });
    }
  }

  async function selectOutput(index) {
    if (!state.ip || !state.connected || switching) return;
    if ((state.output | 0) === (index | 0)) {
      closePicker();
      return;
    }

    switching = true;
    closePicker();
    setState({ output: index, selectingIo: true });
    hapticImpact();

    try {
      await setOutput(state.ip, index);
    } catch (_) {
      // Poller will reconcile.
    } finally {
      switching = false;
      setState({ selectingIo: false });
    }
  }

  function renderPicker(side) {
    const iconOnly = getSourceIconOnly();
    const options = side === 'input'
      ? visibleSources(state.input, getSourceConfig())
      : visibleOutputs(state.output, getOutputConfig());
    const active = side === 'input' ? (state.input | 0) : (state.output | 0);
    const onSelect = side === 'input' ? selectInput : selectOutput;

    pickerStrip.classList.toggle('is-icon-only', iconOnly);
    pickerStrip.setAttribute(
      'aria-label',
      side === 'input' ? 'Input source' : 'Output route',
    );
    pickerStrip.replaceChildren();

    for (const option of options) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'source-chip';
      btn.setAttribute('role', 'option');
      btn.setAttribute('aria-selected', option.index === active ? 'true' : 'false');
      btn.setAttribute('aria-label', option.label);
      btn.title = option.label;
      btn.dataset.index = String(option.index);
      if (option.index === active) btn.classList.add('is-active');
      if (iconOnly) btn.classList.add('is-icon-only');
      if (!state.connected) btn.disabled = true;

      const iconSize = iconOnly ? 22 : 18;
      btn.innerHTML = iconOnly
        ? sourceIconSvg(option.icon, iconSize)
        : `${sourceIconSvg(option.icon, iconSize)}<span class="source-chip-label">${escapeHtml(option.label)}</span>`;
      btn.addEventListener('click', () => onSelect(option.index));
      pickerStrip.appendChild(btn);
    }

    picker.hidden = false;
  }

  function openPicker(side) {
    if (!state.connected) return;
    if (openSide === side) {
      closePicker();
      return;
    }

    openSide = side;
    inputBtn.setAttribute('aria-expanded', side === 'input' ? 'true' : 'false');
    outputBtn.setAttribute('aria-expanded', side === 'output' ? 'true' : 'false');
    inputBtn.classList.toggle('is-open', side === 'input');
    outputBtn.classList.toggle('is-open', side === 'output');
    renderPicker(side);
    hapticImpact();
  }

  function updateArrow() {
    const muted = !!state.muted;
    const level = muted ? 0 : Math.max(0, Math.min(1, (state.volume | 0) / 200));
    // Stroke 1.5 → 5.5; pulse amp 0 → 1; duration 1.8s → 0.55s
    const weight = 1.5 + level * 4;
    const pulse = level;
    const duration = 1.8 - level * 1.25;

    arrow.style.setProperty('--io-arrow-weight', weight.toFixed(2));
    arrow.style.setProperty('--io-arrow-pulse', pulse.toFixed(3));
    arrow.style.setProperty('--io-arrow-duration', `${duration.toFixed(2)}s`);
    arrow.classList.toggle('is-muted', muted || level < 0.02);
    arrow.classList.toggle('is-live', !muted && level >= 0.02);
  }

  function renderEndpoints() {
    const iconOnly = getSourceIconOnly();
    const source = resolveSource(state.input);
    const output = resolveOutput(state.output);
    const iconSize = iconOnly ? 22 : 20;

    flow.classList.toggle('is-icon-only', iconOnly);

    inputIcon.innerHTML = sourceIconSvg(source.icon, iconSize);
    outputIcon.innerHTML = sourceIconSvg(output.icon, iconSize);

    inputLabel.hidden = iconOnly;
    outputLabel.hidden = iconOnly;
    inputLabel.textContent = source.label;
    outputLabel.textContent = output.label;

    inputBtn.setAttribute('aria-label', `Input: ${source.label}`);
    outputBtn.setAttribute('aria-label', `Output: ${output.label}`);
    inputBtn.title = source.label;
    outputBtn.title = output.label;

    const disabled = !state.connected;
    inputBtn.disabled = disabled;
    outputBtn.disabled = disabled;
  }

  function render() {
    renderEndpoints();
    updateArrow();
    if (openSide) renderPicker(openSide);
  }

  inputBtn.addEventListener('click', () => openPicker('input'));
  outputBtn.addEventListener('click', () => openPicker('output'));

  document.addEventListener('pointerdown', (e) => {
    if (!openSide) return;
    if (root.contains(e.target)) return;
    closePicker();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && openSide) {
      e.preventDefault();
      closePicker();
    }
  });

  return { render, closePicker };
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
