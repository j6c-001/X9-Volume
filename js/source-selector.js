import { setInput } from './api.js';
import { state, setState } from './state.js';
import { hapticImpact } from './haptics.js';
import {
  getSourceConfig,
  getSourceIconOnly,
  visibleSources,
  sourceIconSvg,
} from './sources.js';

export function createSourceSelector(root) {
  let switching = false;

  root.innerHTML = `
    <div class="source-strip" id="source-strip" role="listbox" aria-label="Input source"></div>
  `;
  const strip = root.querySelector('#source-strip');

  async function select(index) {
    if (!state.ip || !state.connected || switching) return;
    if ((state.input | 0) === (index | 0)) return;

    switching = true;
    setState({ input: index });
    hapticImpact();

    try {
      await setInput(state.ip, index);
    } catch (_) {
      // Poller will reconcile; keep optimistic selection for now.
    } finally {
      switching = false;
    }
  }

  function render() {
    const config = getSourceConfig();
    const sources = visibleSources(state.input, config);
    const active = state.input | 0;
    const iconOnly = getSourceIconOnly();

    strip.classList.toggle('is-icon-only', iconOnly);
    strip.replaceChildren();
    for (const source of sources) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'source-chip';
      btn.setAttribute('role', 'option');
      btn.setAttribute('aria-selected', source.index === active ? 'true' : 'false');
      btn.setAttribute('aria-label', source.label);
      btn.title = source.label;
      btn.dataset.index = String(source.index);
      if (source.index === active) btn.classList.add('is-active');
      if (iconOnly) btn.classList.add('is-icon-only');
      if (!state.connected) btn.disabled = true;

      const iconSize = iconOnly ? 22 : 18;
      btn.innerHTML = iconOnly
        ? sourceIconSvg(source.icon, iconSize)
        : `${sourceIconSvg(source.icon, iconSize)}<span class="source-chip-label">${escapeHtml(source.label)}</span>`;
      btn.addEventListener('click', () => select(source.index));
      strip.appendChild(btn);
    }
  }

  return { render };
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
