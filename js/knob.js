import { toDb, toVolume, setVolume, toggleMute } from './api.js';
import { state, setState } from './state.js';
import { forceSync } from './poller.js';
import {
  armHaptics,
  hapticTick,
  hapticMajor,
  hapticEndstop,
  hapticGrab,
  hapticRelease,
  hapticImpact,
} from './haptics.js';
import {
  getMaxVolumeDb,
  getLoudGateDb,
  LOUD_ZONE_GEAR,
  VOLUME_DB_FLOOR,
  VOLUME_DB_CEILING,
} from './volume-limit.js';

const MIN_DB = VOLUME_DB_FLOOR;
const MAX_DB = VOLUME_DB_CEILING;
const START_ANGLE = 135;
const SWEEP = 270;

/** Degrees of finger rotation needed for full −100..0 dB (higher = meatier). */
const GEAR_DEG = 320;

const SIZE = 400;
const CX = SIZE / 2;
const CY = SIZE / 2;
const TRACK_R = 168;
const BODY_R = 128;
const INDICATOR_R = 98;
const HIT_INNER = 0.38;
const HIT_OUTER = 0.98;

function dbToAngle(db) {
  const t = (db - MIN_DB) / (MAX_DB - MIN_DB);
  return START_ANGLE + t * SWEEP;
}

function dbToKnobRotation(db) {
  // Indicator is drawn pointing up (−90°); rotate so it matches the track angle.
  return dbToAngle(db) + 90;
}

function polar(cx, cy, r, deg) {
  const rad = (deg * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeArc(cx, cy, r, startDeg, endDeg) {
  if (endDeg <= startDeg) {
    const p = polar(cx, cy, r, startDeg);
    return `M ${p.x} ${p.y}`;
  }
  const start = polar(cx, cy, r, endDeg);
  const end = polar(cx, cy, r, startDeg);
  const large = endDeg - startDeg <= 180 ? 0 : 1;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 0 ${end.x} ${end.y}`;
}

function buildTickMarks() {
  const ticks = [];
  for (let i = 0; i < 36; i++) {
    const deg = (i / 36) * 360;
    const outer = polar(CX, CY, BODY_R - 6, deg);
    const inner = polar(CX, CY, BODY_R - (i % 3 === 0 ? 22 : 14), deg);
    ticks.push(
      `<line class="knob-tick" x1="${inner.x}" y1="${inner.y}" x2="${outer.x}" y2="${outer.y}" />`,
    );
  }
  return ticks.join('');
}

export function createKnob(root) {
  root.innerHTML = `
    <div class="knob-stack" id="knob-stack">
      <svg class="knob-svg" viewBox="0 0 ${SIZE} ${SIZE}" aria-hidden="true">
        <defs>
          <radialGradient id="knob-body-grad" cx="38%" cy="32%" r="65%">
            <stop offset="0%" stop-color="#3a3a48"/>
            <stop offset="55%" stop-color="#1c1c26"/>
            <stop offset="100%" stop-color="#0e0e14"/>
          </radialGradient>
          <filter id="knob-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#000" flood-opacity="0.55"/>
          </filter>
        </defs>
        <path class="knob-track" d="${describeArc(CX, CY, TRACK_R, START_ANGLE, START_ANGLE + SWEEP)}" />
        <path class="knob-headroom" id="knob-headroom" d="" />
        <path class="knob-fill" id="knob-fill" d="${describeArc(CX, CY, TRACK_R, START_ANGLE, START_ANGLE)}" />
        <g class="knob-body" id="knob-body" filter="url(#knob-shadow)">
          <circle class="knob-body-disc" cx="${CX}" cy="${CY}" r="${BODY_R}" fill="url(#knob-body-grad)" />
          <circle class="knob-body-rim" cx="${CX}" cy="${CY}" r="${BODY_R}" />
          <circle class="knob-body-inner" cx="${CX}" cy="${CY}" r="${BODY_R - 28}" />
          ${buildTickMarks()}
          <line class="knob-indicator" id="knob-indicator"
            x1="${CX}" y1="${CY - INDICATOR_R + 8}"
            x2="${CX}" y2="${CY - INDICATOR_R + 36}" />
        </g>
        <circle class="knob-handle" id="knob-handle" cx="${CX}" cy="${CY}" r="14" />
      </svg>
      <button type="button" class="knob-mute" id="knob-mute" aria-label="Mute">
        <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true">
          <path class="mute-on" d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
          <path class="mute-off" d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.89.89L19 14.73V9.27l-1.61 1.61c.04.28.06.58.06.89 0 .68-.16 1.32-.44 1.89l1.38 1.38c.68-.98 1.08-2.16 1.08-3.43 0-3.31-2.69-6-6-6-1.01 0-1.97.25-2.8.69l1.46 1.46C10.74 7.13 11.35 7 12 7c2.21 0 4 1.79 4 4 0 .65-.13 1.26-.37 1.81l1.76 1.76zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
        </svg>
      </button>
      <div class="knob-readout" id="knob-readout">-50.0 dB</div>
    </div>
  `;

  const stack = root.querySelector('#knob-stack');
  const fill = root.querySelector('#knob-fill');
  const headroom = root.querySelector('#knob-headroom');
  const handle = root.querySelector('#knob-handle');
  const body = root.querySelector('#knob-body');
  const readout = root.querySelector('#knob-readout');
  const muteBtn = root.querySelector('#knob-mute');

  let pendingVolume = null;
  let throttleTimer = null;
  let localDb = toDb(state.volume);
  let lastSentStep = null;
  let endstopLatched = false;
  let gateLatched = false;
  let loudZoneAdmitted = false;
  let didDrag = false;

  function softMaxDb() {
    return getMaxVolumeDb();
  }

  function loudGateDb() {
    return getLoudGateDb(softMaxDb());
  }

  /** 0..1 warning heat — rises through the approach into the loud zone, peaks at soft max. */
  function warningHeat(db) {
    const max = softMaxDb();
    const gate = loudGateDb();
    const span = Math.max(1e-6, max - gate);
    const pre = 10;
    if (db <= gate - pre) return 0;
    if (db <= gate) {
      return 0.2 * ((db - (gate - pre)) / pre);
    }
    return Math.min(1, 0.2 + 0.55 * ((db - gate) / span));
  }

  function warnColor(heat, alpha = 1) {
    // Soft rose — stays warm, never hits neon red.
    const t = Math.max(0, Math.min(1, heat));
    const r = Math.round(198 + (212 - 198) * t);
    const g = Math.round(128 + (92 - 128) * t);
    const b = Math.round(108 + (86 - 108) * t);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function render(db) {
    const max = softMaxDb();
    const angle = dbToAngle(db);
    const maxAngle = dbToAngle(max);
    const heat = warningHeat(db);
    const muted = state.muted;
    const warning = !muted && heat > 0.02;

    fill.setAttribute('d', describeArc(CX, CY, TRACK_R, START_ANGLE, angle));

    // Remaining usable arc (current → soft max); pulse strength rises as headroom shrinks.
    const headroomStart = Math.min(db, max);
    if (warning && maxAngle - dbToAngle(headroomStart) > 0.15) {
      headroom.setAttribute(
        'd',
        describeArc(CX, CY, TRACK_R, dbToAngle(headroomStart), maxAngle),
      );
      headroom.style.visibility = 'visible';
      headroom.style.stroke = warnColor(Math.max(0.25, heat), 0.38 + heat * 0.22);
      stack.style.setProperty('--knob-warn-opacity-min', String(0.14 + heat * 0.16));
      stack.style.setProperty('--knob-warn-opacity-max', String(0.3 + heat * 0.28));
      stack.style.setProperty('--knob-warn-glow', warnColor(heat, 0.28 + heat * 0.22));
    } else {
      headroom.setAttribute('d', '');
      headroom.style.visibility = 'hidden';
      headroom.style.stroke = '';
      stack.style.removeProperty('--knob-warn-opacity-min');
      stack.style.removeProperty('--knob-warn-opacity-max');
      stack.style.removeProperty('--knob-warn-glow');
    }

    // Keep the used fill (−100 dB → position) on the accent; warn via headroom + knob.
    fill.style.stroke = '';
    fill.style.filter = '';

    if (warning) {
      handle.style.fill = warnColor(heat * 0.7, 1);
      handle.style.stroke = 'var(--bg)';
      stack.style.setProperty('--knob-warn', warnColor(heat, 1));
    } else {
      handle.style.fill = '';
      handle.style.stroke = '';
      handle.style.filter = '';
      stack.style.removeProperty('--knob-warn');
    }

    const p = polar(CX, CY, TRACK_R, angle);
    handle.setAttribute('cx', p.x);
    handle.setAttribute('cy', p.y);
    body.style.transform = `rotate(${dbToKnobRotation(db)}deg)`;
    body.style.transformOrigin = `${CX}px ${CY}px`;
    readout.textContent = `${db.toFixed(1)} dB`;
    stack.classList.toggle('is-warning', warning);
  }

  function flushVolume() {
    if (pendingVolume === null || !state.ip || state.muted) return;
    const v = pendingVolume;
    pendingVolume = null;
    setVolume(state.ip, v).catch(() => {});
  }

  function feedbackForStep(prevVolume, nextVolume) {
    const minVol = toVolume(MIN_DB, state.soundStep);
    const maxVol = toVolume(softMaxDb(), state.soundStep);
    const atEnd = nextVolume <= minVol || nextVolume >= maxVol;

    if (atEnd) {
      if (!endstopLatched) {
        endstopLatched = true;
        hapticEndstop();
      }
      return;
    }

    endstopLatched = false;
    const prevDb = toDb(prevVolume);
    const nextDb = toDb(nextVolume);
    // Stronger detent every 5 dB
    if (Math.floor(prevDb / 5) !== Math.floor(nextDb / 5)) {
      hapticMajor();
    } else {
      hapticTick();
    }
  }

  function scheduleVolume(db) {
    if (state.muted) return;
    const volume = toVolume(db, state.soundStep);
    pendingVolume = volume;
    if (lastSentStep !== volume) {
      const prev = lastSentStep ?? volume;
      lastSentStep = volume;
      feedbackForStep(prev, volume);
    }
    if (throttleTimer) return;
    throttleTimer = setTimeout(() => {
      throttleTimer = null;
      flushVolume();
    }, 60);
  }

  function applyDb(db) {
    if (state.muted) return;
    const max = softMaxDb();
    let next = Math.max(MIN_DB, db);
    if (next > max) {
      // Device may already be above the soft max — don't yank it down on touch.
      // Block further increases; allow decreases through the ceiling.
      next = localDb > max ? Math.min(next, localDb) : max;
    }
    localDb = next;
    render(localDb);
    scheduleVolume(localDb);
  }

  function pointerMetrics(clientX, clientY) {
    const rect = stack.getBoundingClientRect();
    const half = rect.width / 2;
    const x = clientX - rect.left - half;
    const y = clientY - rect.top - half;
    const rNorm = Math.hypot(x, y) / half;
    const angle = (Math.atan2(y, x) * 180) / Math.PI;
    return { rNorm, angle };
  }

  function isOnKnob(rNorm) {
    return rNorm >= HIT_INNER && rNorm <= HIT_OUTER;
  }

  let pointerDown = false;
  let dragActive = false;
  let lastPointerAngle = null;
  let activePointerId = null;

  function canAdjustVolume() {
    return state.connected && !state.muted;
  }

  function onPointerDown(e) {
    if (!canAdjustVolume()) return;
    if (e.target.closest('.knob-mute')) return;

    const { rNorm, angle } = pointerMetrics(e.clientX, e.clientY);
    if (!isOnKnob(rNorm)) return;

    e.preventDefault();
    armHaptics();
    pointerDown = true;
    dragActive = true;
    didDrag = false;
    activePointerId = e.pointerId;
    lastPointerAngle = angle;
    lastSentStep = toVolume(localDb, state.soundStep);
    const maxDb = softMaxDb();
    const gate = loudGateDb();
    // Already in the loud zone (or at the gate): this grab may continue upward.
    loudZoneAdmitted = localDb >= gate - 1e-6;
    gateLatched = false;
    endstopLatched = lastSentStep <= toVolume(MIN_DB, state.soundStep)
      || lastSentStep >= toVolume(maxDb, state.soundStep);
    stack.classList.add('is-dragging');
    setState({ dragging: true });
    hapticGrab();
    try { stack.setPointerCapture(e.pointerId); } catch (_) {}
  }

  function onPointerMove(e) {
    if (!pointerDown || !dragActive) return;
    if (activePointerId != null && e.pointerId !== activePointerId) return;

    const { angle } = pointerMetrics(e.clientX, e.clientY);
    let delta = angle - lastPointerAngle;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;

    // Cap per-frame jumps so a stray sample can't slam volume
    delta = Math.max(-24, Math.min(24, delta));

    let dbDelta = (delta / GEAR_DEG) * (MAX_DB - MIN_DB);
    const gate = loudGateDb();

    // Leaving the loud zone clears admission so re-entry needs another grab.
    if (localDb < gate - 1e-6) {
      loudZoneAdmitted = false;
      gateLatched = false;
    }

    // Stiffer gearing when raising volume inside the loud zone.
    if (dbDelta > 0 && loudZoneAdmitted && localDb >= gate - 1e-6) {
      dbDelta /= LOUD_ZONE_GEAR;
    }

    let nextDb = localDb + dbDelta;

    // Soft gate: first upward cross into the loud zone stops until re-grab.
    if (dbDelta > 0 && !loudZoneAdmitted) {
      if (localDb < gate && nextDb >= gate) {
        nextDb = gate;
        if (Math.abs(nextDb - localDb) > 0.001) didDrag = true;
        applyDb(nextDb);
        if (!gateLatched) {
          gateLatched = true;
          hapticImpact();
        }
        lastPointerAngle = angle;
        return;
      }
      if (localDb >= gate - 1e-6) {
        lastPointerAngle = angle;
        return;
      }
    }

    if (Math.abs(nextDb - localDb) > 0.001) didDrag = true;
    applyDb(nextDb);
    lastPointerAngle = angle;
  }

  function onPointerUp(e) {
    if (!pointerDown) return;
    if (activePointerId != null && e.pointerId !== activePointerId) return;

    pointerDown = false;
    stack.classList.remove('is-dragging');

    if (dragActive) {
      const volume = toVolume(localDb, state.soundStep);
      localDb = toDb(volume);
      render(localDb);
      setState({ volume, dragging: false });
      pendingVolume = volume;
      flushVolume();
      if (didDrag) hapticRelease();
    }

    dragActive = false;
    didDrag = false;
    lastPointerAngle = null;
    activePointerId = null;
    try { stack.releasePointerCapture(e.pointerId); } catch (_) {}
  }

  stack.addEventListener('pointerdown', onPointerDown);
  stack.addEventListener('pointermove', onPointerMove);
  stack.addEventListener('pointerup', onPointerUp);
  stack.addEventListener('pointercancel', onPointerUp);
  stack.addEventListener('lostpointercapture', onPointerUp);

  async function onMute(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!state.ip || state.togglingMute) return;

    armHaptics();
    hapticImpact();
    setState({ togglingMute: true });
    try {
      await toggleMute(state.ip);
      await forceSync();
    } catch (_) {
      await forceSync();
    } finally {
      setState({ togglingMute: false });
    }
  }

  muteBtn.addEventListener('pointerup', onMute);
  muteBtn.addEventListener('click', (e) => e.preventDefault());

  function syncFromState() {
    const unavailable = !state.connected;
    const muted = state.muted;
    stack.classList.toggle('disabled', unavailable);
    stack.classList.toggle('is-muted', muted);
    muteBtn.classList.toggle('is-muted', muted);
    muteBtn.disabled = unavailable;
    muteBtn.setAttribute('aria-label', muted ? 'Unmute' : 'Mute');
    readout.classList.toggle('is-muted', muted);

    if (pointerDown && (unavailable || muted)) {
      pointerDown = false;
      dragActive = false;
      lastPointerAngle = null;
      activePointerId = null;
      stack.classList.remove('is-dragging');
      if (state.dragging) setState({ dragging: false });
    }

    if (!state.dragging) {
      localDb = toDb(state.volume);
      render(localDb);
    }
  }

  syncFromState();
  return { syncFromState };
}
