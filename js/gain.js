import { GAIN_LABELS, OUTPUT_HEADPHONE, setDacGain } from './api.js';
import { state, setState } from './state.js';
import { hapticImpact } from './haptics.js';

const SELECTING_HOLD_MS = 900;

function clampGain(index) {
  return Math.max(0, Math.min(GAIN_LABELS.length - 1, index | 0));
}

export function createGainControl(root) {
  root.innerHTML = `
    <div class="gain-control" id="gain-control" role="group" aria-label="Headphone gain" hidden>
      <span class="gain-label" id="gain-label">Gain</span>
      <div class="gain-segments" id="gain-segments">
        ${GAIN_LABELS.map((label, index) => `
          <button
            type="button"
            class="gain-segment"
            data-index="${index}"
            aria-pressed="false"
          >${label}</button>
        `).join('')}
      </div>
    </div>
  `;

  const control = root.querySelector('#gain-control');
  const segments = [...root.querySelectorAll('.gain-segment')];
  let switching = false;
  let selectingTimer = null;

  function markSelecting() {
    setState({ selectingGain: true });
    clearTimeout(selectingTimer);
    selectingTimer = setTimeout(() => {
      setState({ selectingGain: false });
    }, SELECTING_HOLD_MS);
  }

  async function selectGain(index) {
    if (!state.ip || !state.connected || switching) return;
    if ((state.output | 0) !== OUTPUT_HEADPHONE) return;

    const next = clampGain(index);
    if (clampGain(state.dacGain) === next) return;

    switching = true;
    markSelecting();
    setState({ dacGain: next });
    hapticImpact();

    try {
      await setDacGain(state.ip, next);
    } catch (_) {
      // Poller will reconcile.
    } finally {
      switching = false;
    }
  }

  for (const btn of segments) {
    btn.addEventListener('click', () => {
      selectGain(Number(btn.dataset.index));
    });
  }

  function render() {
    const show = (state.output | 0) === OUTPUT_HEADPHONE;
    control.hidden = !show;
    root.hidden = !show;
    if (!show) return;

    const active = clampGain(state.dacGain);
    const enabled = !!state.ip && state.connected && !switching;

    for (const btn of segments) {
      const index = Number(btn.dataset.index);
      const isActive = index === active;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      btn.disabled = !enabled;
    }
  }

  return { render };
}
