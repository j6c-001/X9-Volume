import { toDb, toVolume, setVolume, toggleMute } from './api.js';
import { state, setState, haptic } from './state.js';

const MIN_DB = -100;
const MAX_DB = 0;
const START_ANGLE = 135;
const SWEEP = 270;

function dbToAngle(db) {
  const t = (db - MIN_DB) / (MAX_DB - MIN_DB);
  return START_ANGLE + t * SWEEP;
}

function polar(cx, cy, r, deg) {
  const rad = (deg * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeArc(cx, cy, r, startDeg, endDeg) {
  const start = polar(cx, cy, r, endDeg);
  const end = polar(cx, cy, r, startDeg);
  const large = endDeg - startDeg <= 180 ? 0 : 1;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 0 ${end.x} ${end.y}`;
}

export function createKnob(root) {
  const SIZE = 320;
  const CX = SIZE / 2;
  const CY = SIZE / 2;
  const R = 120;
  const STROKE = 14;

  root.innerHTML = `
    <div class="knob-wrap" id="knob-wrap">
      <svg class="knob-svg" viewBox="0 0 ${SIZE} ${SIZE}" aria-hidden="true">
        <path class="knob-track" d="${describeArc(CX, CY, R, START_ANGLE, START_ANGLE + SWEEP)}" />
        <path class="knob-fill" id="knob-fill" d="${describeArc(CX, CY, R, START_ANGLE, START_ANGLE)}" />
        <circle class="knob-dot" id="knob-dot" cx="${CX}" cy="${CY}" r="8" />
      </svg>
      <div class="knob-readout" id="knob-readout">-50.0 dB</div>
      <button type="button" class="knob-mute" id="knob-mute" aria-label="Mute">
        <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
          <path class="mute-on" d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
          <path class="mute-off" d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.89.89L19 14.73V9.27l-1.61 1.61c.04.28.06.58.06.89 0 .68-.16 1.32-.44 1.89l1.38 1.38c.68-.98 1.08-2.16 1.08-3.43 0-3.31-2.69-6-6-6-1.01 0-1.97.25-2.8.69l1.46 1.46C10.74 7.13 11.35 7 12 7c2.21 0 4 1.79 4 4 0 .65-.13 1.26-.37 1.81l1.76 1.76zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
        </svg>
      </button>
    </div>
  `;

  const wrap = root.querySelector('#knob-wrap');
  const fill = root.querySelector('#knob-fill');
  const dot = root.querySelector('#knob-dot');
  const readout = root.querySelector('#knob-readout');
  const muteBtn = root.querySelector('#knob-mute');

  let pendingVolume = null;
  let throttleTimer = null;
  let localDb = toDb(state.volume);

  function render(db) {
    const angle = dbToAngle(db);
    fill.setAttribute('d', describeArc(CX, CY, R, START_ANGLE, angle));
    const p = polar(CX, CY, R, angle);
    dot.setAttribute('cx', p.x);
    dot.setAttribute('cy', p.y);
    readout.textContent = `${db.toFixed(1)} dB`;
  }

  function flushVolume() {
    if (pendingVolume === null || !state.ip) return;
    const v = pendingVolume;
    pendingVolume = null;
    setVolume(state.ip, v).catch(() => {});
  }

  function scheduleVolume(volume) {
    pendingVolume = volume;
    if (throttleTimer) return;
    throttleTimer = setTimeout(() => {
      throttleTimer = null;
      flushVolume();
    }, 80);
  }

  function applyDb(db) {
    const volume = toVolume(db, state.soundStep);
    localDb = toDb(volume);
    render(localDb);
    setState({ volume });
    scheduleVolume(volume);
  }

  function pointerAngle(clientX, clientY) {
    const rect = wrap.getBoundingClientRect();
    const x = clientX - rect.left - rect.width / 2;
    const y = clientY - rect.top - rect.height / 2;
    return (Math.atan2(y, x) * 180) / Math.PI;
  }

  const DRAG_THRESHOLD = 8;
  let pointerDown = false;
  let dragActive = false;
  let startX = 0;
  let startY = 0;
  let lastPointerAngle = null;

  function onPointerDown(e) {
    if (!state.connected || state.poweredOff) return;
    if (e.target.closest('#knob-mute')) return;

    pointerDown = true;
    dragActive = false;
    startX = e.clientX;
    startY = e.clientY;
    lastPointerAngle = null;
    wrap.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e) {
    if (!pointerDown) return;

    const angle = pointerAngle(e.clientX, e.clientY);

    if (!dragActive) {
      const dist = Math.hypot(e.clientX - startX, e.clientY - startY);
      if (dist < DRAG_THRESHOLD) return;
      dragActive = true;
      setState({ dragging: true });
      lastPointerAngle = angle;
      return;
    }

    let delta = angle - lastPointerAngle;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;

    const dbDelta = (delta / SWEEP) * (MAX_DB - MIN_DB);
    applyDb(localDb + dbDelta);
    lastPointerAngle = angle;
  }

  function onPointerUp(e) {
    if (!pointerDown) return;
    pointerDown = false;

    if (dragActive) {
      flushVolume();
      setState({ dragging: false });
    }

    dragActive = false;
    lastPointerAngle = null;
    try { wrap.releasePointerCapture(e.pointerId); } catch (_) {}
  }

  wrap.addEventListener('pointerdown', onPointerDown);
  wrap.addEventListener('pointermove', onPointerMove);
  wrap.addEventListener('pointerup', onPointerUp);
  wrap.addEventListener('pointercancel', onPointerUp);

  muteBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (!state.ip || state.poweredOff) return;
    haptic();
    setState({ togglingMute: true, muted: !state.muted });
    try {
      await toggleMute(state.ip);
    } catch (_) {
      setState({ muted: !state.muted });
    } finally {
      setTimeout(() => setState({ togglingMute: false }), 300);
    }
  });

  function syncFromState() {
    wrap.classList.toggle('disabled', !state.connected || state.poweredOff);
    muteBtn.classList.toggle('is-muted', state.muted);
    muteBtn.disabled = !state.connected || state.poweredOff;
    if (!state.dragging) {
      localDb = toDb(state.volume);
      render(localDb);
    }
  }

  syncFromState();
  return { syncFromState };
}
