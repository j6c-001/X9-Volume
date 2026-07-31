import { setInput } from './api.js';
import { state, setState, haptic } from './state.js';
import { getSourceConfig, visibleSources, sourceIconSvg } from './sources.js';

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
    haptic();

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

    strip.replaceChildren();
    for (const source of sources) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'source-chip';
      btn.setAttribute('role', 'option');
      btn.setAttribute('aria-selected', source.index === active ? 'true' : 'false');
      btn.dataset.index = String(source.index);
      if (source.index === active) btn.classList.add('is-active');
      if (!state.connected) btn.disabled = true;

      btn.innerHTML = `
        ${sourceIconSvg(source.icon, 18)}
        <span class="source-chip-label">${escapeHtml(source.label)}</span>
      `;
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
