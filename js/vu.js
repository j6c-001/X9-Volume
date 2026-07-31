import { setVu } from './api.js';
import { state, setState } from './state.js';
import { hapticImpact } from './haptics.js';

const SHOW_KEY = 'x9-show-vu';
const VU_CDN = 'https://am.luxsinaudio.com/x9/v2/modern/images/vu';
const DEFAULT_COUNT = 16;
const SETTLE_MS = 140;
const SELECTING_HOLD_MS = 900;

/** 1-based CDN filename: vu1.png … vu16.png */
export function vuImageUrl(index0) {
  const n = Math.max(0, index0 | 0) + 1;
  return `${VU_CDN}/vu${n}.png`;
}

export function getShowVuSelector() {
  const raw = localStorage.getItem(SHOW_KEY);
  if (raw === null) return true;
  return raw === '1' || raw === 'true';
}

export function saveShowVuSelector(show) {
  const next = !!show;
  localStorage.setItem(SHOW_KEY, next ? '1' : '0');
  return next;
}

function vuCount() {
  const n = state.vuCount | 0;
  return n > 0 ? n : DEFAULT_COUNT;
}

function clampVu(index) {
  return Math.max(0, Math.min(vuCount() - 1, index | 0));
}

export function createVuSelector(root) {
  const overlay = document.getElementById('vu-overlay');
  const sheet = document.getElementById('vu-sheet');
  const closeBtn = document.getElementById('vu-close');
  const carousel = document.getElementById('vu-carousel');
  const metaEl = document.getElementById('vu-carousel-meta');

  root.innerHTML = `
    <button type="button" class="vu-entry" id="vu-entry" aria-haspopup="dialog" aria-controls="vu-sheet">
      <span class="vu-entry-frame">
        <img class="vu-entry-img" id="vu-entry-img" alt="" width="954" height="394" decoding="async">
      </span>
    </button>
  `;

  const entryBtn = root.querySelector('#vu-entry');
  const entryImg = root.querySelector('#vu-entry-img');

  let open = false;
  let slidesBuiltFor = -1;
  let settling = false;
  let ignoreScroll = false;
  let userScrolling = false;
  let scrollTimer = null;
  let selectingTimer = null;
  let lastCommitted = -1;
  let pointerStartY = null;
  let sheetDragY = 0;

  function styleLabel(index) {
    return `VU ${clampVu(index) + 1}`;
  }

  function metaText(index) {
    const i = clampVu(index);
    return `${styleLabel(i)} · ${i + 1} / ${vuCount()}`;
  }

  function markSelecting() {
    setState({ selectingVu: true });
    clearTimeout(selectingTimer);
    selectingTimer = setTimeout(() => {
      setState({ selectingVu: false });
    }, SELECTING_HOLD_MS);
  }

  function buildSlides(force = false) {
    const count = vuCount();
    if (!force && slidesBuiltFor === count) return;
    slidesBuiltFor = count;
    carousel.replaceChildren();

    for (let i = 0; i < count; i++) {
      const slide = document.createElement('button');
      slide.type = 'button';
      slide.className = 'vu-slide';
      slide.dataset.index = String(i);
      slide.setAttribute('aria-label', styleLabel(i));
      slide.innerHTML = `
        <img
          class="vu-slide-img"
          src="${vuImageUrl(i)}"
          alt=""
          width="954"
          height="394"
          decoding="async"
          ${i === 0 || i === (state.vu | 0) ? '' : 'loading="lazy"'}
          draggable="false"
        >
      `;
      slide.addEventListener('click', () => {
        if (!open) return;
        scrollToIndex(i, true);
        commitIndex(i);
      });
      carousel.appendChild(slide);
    }
  }

  function slideWidth() {
    const slide = carousel.querySelector('.vu-slide');
    if (!slide) return carousel.clientWidth;
    const style = getComputedStyle(carousel);
    const gap = parseFloat(style.columnGap || style.gap || '0') || 0;
    return slide.getBoundingClientRect().width + gap;
  }

  function nearestIndex() {
    const w = slideWidth();
    if (w <= 0) return clampVu(state.vu);
    return clampVu(Math.round(carousel.scrollLeft / w));
  }

  function scrollToIndex(index, smooth) {
    const i = clampVu(index);
    const w = slideWidth();
    ignoreScroll = true;
    userScrolling = false;
    if (smooth) {
      carousel.scrollTo({ left: i * w, behavior: 'smooth' });
    } else {
      carousel.scrollLeft = i * w;
    }
    requestAnimationFrame(() => {
      ignoreScroll = false;
    });
    highlightSlides(i);
    metaEl.textContent = metaText(i);
  }

  function highlightSlides(index) {
    const active = clampVu(index);
    for (const slide of carousel.querySelectorAll('.vu-slide')) {
      const on = (slide.dataset.index | 0) === active;
      slide.classList.toggle('is-active', on);
      slide.setAttribute('aria-current', on ? 'true' : 'false');
    }
  }

  async function commitIndex(index) {
    const i = clampVu(index);
    if (!state.ip || !state.connected) return;
    if (i === lastCommitted && i === (state.vu | 0)) {
      highlightSlides(i);
      metaEl.textContent = metaText(i);
      return;
    }

    lastCommitted = i;
    markSelecting();
    setState({ vu: i });
    highlightSlides(i);
    metaEl.textContent = metaText(i);
    renderEntry();
    hapticImpact();

    try {
      await setVu(state.ip, i);
    } catch (_) {
      // Poller reconciles.
    }
  }

  function settleFromScroll() {
    if (!open || ignoreScroll || settling) return;
    settling = true;
    userScrolling = false;
    const i = nearestIndex();
    highlightSlides(i);
    metaEl.textContent = metaText(i);
    commitIndex(i).finally(() => {
      settling = false;
    });
  }

  function onScroll() {
    if (!open || ignoreScroll) return;
    userScrolling = true;
    const i = nearestIndex();
    highlightSlides(i);
    metaEl.textContent = metaText(i);
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(settleFromScroll, SETTLE_MS);
  }

  function renderEntry() {
    const show = getShowVuSelector();
    root.hidden = !show;
    if (!show && open) closeSheet();

    const i = clampVu(state.vu);
    entryBtn.setAttribute('aria-label', `Display style, ${styleLabel(i)}`);
    entryBtn.disabled = !state.connected;

    const src = vuImageUrl(i);
    if (entryImg.getAttribute('src') !== src) {
      entryImg.src = src;
    }
  }

  function openSheet() {
    if (!state.connected || !getShowVuSelector()) return;
    buildSlides();
    overlay.hidden = false;
    open = true;
    lastCommitted = clampVu(state.vu);
    metaEl.textContent = metaText(state.vu);
    hapticImpact();

    requestAnimationFrame(() => {
      overlay.classList.add('is-open');
      requestAnimationFrame(() => {
        scrollToIndex(state.vu, false);
        closeBtn.focus({ preventScroll: true });
      });
    });
  }

  function closeSheet() {
    if (!open && overlay.hidden) return;
    open = false;
    clearTimeout(scrollTimer);
    overlay.classList.remove('is-open');
    sheet.style.transform = '';
    sheetDragY = 0;

    const finish = () => {
      if (!overlay.classList.contains('is-open')) {
        overlay.hidden = true;
      }
      overlay.removeEventListener('transitionend', finish);
    };
    overlay.addEventListener('transitionend', finish);
    // Guarantee hide if transitionend is skipped
    setTimeout(finish, 320);
    entryBtn.focus({ preventScroll: true });
  }

  entryBtn.addEventListener('click', openSheet);
  closeBtn.addEventListener('click', closeSheet);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeSheet();
  });

  document.addEventListener('keydown', (e) => {
    if (!open) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      closeSheet();
    }
  });

  carousel.addEventListener('scroll', onScroll, { passive: true });
  carousel.addEventListener('scrollend', () => {
    clearTimeout(scrollTimer);
    settleFromScroll();
  });

  // Light pull-down dismiss from the sheet chrome (not the carousel).
  sheet.addEventListener('pointerdown', (e) => {
    if (!open) return;
    if (e.target.closest('.vu-carousel') || e.target.closest('.vu-close')) return;
    pointerStartY = e.clientY;
    sheetDragY = 0;
  });

  sheet.addEventListener('pointermove', (e) => {
    if (pointerStartY == null) return;
    const dy = e.clientY - pointerStartY;
    if (dy <= 0) {
      sheetDragY = 0;
      sheet.style.transform = '';
      return;
    }
    sheetDragY = dy;
    sheet.style.transform = `translateY(${dy}px)`;
  });

  function endSheetDrag() {
    if (pointerStartY == null) return;
    const dy = sheetDragY;
    pointerStartY = null;
    sheetDragY = 0;
    if (dy > 88) {
      sheet.style.transform = '';
      closeSheet();
      return;
    }
    sheet.style.transform = '';
  }

  sheet.addEventListener('pointerup', endSheetDrag);
  sheet.addEventListener('pointercancel', endSheetDrag);

  function render() {
    buildSlides();
    renderEntry();
    if (open && !ignoreScroll && !userScrolling && !settling) {
      const i = clampVu(state.vu);
      if (nearestIndex() !== i) scrollToIndex(i, true);
      else {
        highlightSlides(i);
        metaEl.textContent = metaText(i);
      }
    }
  }

  return {
    render,
    open: openSheet,
    close: closeSheet,
    setVisible(show) {
      saveShowVuSelector(show);
      renderEntry();
    },
  };
}
