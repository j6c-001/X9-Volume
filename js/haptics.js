/**
 * Tactile feedback for the volume dial.
 * Uses Vibration API when available; falls back to a short Web Audio click
 * (e.g. iOS Safari has no vibrate support).
 */

let audioCtx = null;
let lastPulseAt = 0;

function canVibrate() {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

function vibrate(pattern) {
  if (!canVibrate()) return false;
  try {
    navigator.vibrate(0);
    navigator.vibrate(pattern);
    return true;
  } catch (_) {
    return false;
  }
}

function ensureAudio() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!audioCtx) audioCtx = new AC();
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/** Resume audio graph from a user gesture so iOS can play ticks. */
export function armHaptics() {
  ensureAudio();
}

function playClick({ freq = 210, gain = 0.03, ms = 16 } = {}) {
  const ctx = ensureAudio();
  if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq * 0.55), t + ms / 1000);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + ms / 1000 + 0.01);
}

function pulse(kind) {
  const now = performance.now();
  // Keep rapid dial ticks crisp without stacking into a continuous buzz.
  const minGap = kind === 'tick' ? 12 : kind === 'major' ? 18 : 0;
  if (minGap && now - lastPulseAt < minGap) return;
  lastPulseAt = now;

  if (kind === 'tick') {
    if (!vibrate(5)) playClick({ freq: 240, gain: 0.022, ms: 12 });
    return;
  }
  if (kind === 'major') {
    if (!vibrate(10)) playClick({ freq: 170, gain: 0.034, ms: 18 });
    return;
  }
  if (kind === 'endstop') {
    if (!vibrate([14, 32, 22])) playClick({ freq: 120, gain: 0.045, ms: 28 });
    return;
  }
  if (kind === 'grab') {
    if (!vibrate(8)) playClick({ freq: 150, gain: 0.02, ms: 14 });
    return;
  }
  if (kind === 'release') {
    if (!vibrate(6)) playClick({ freq: 190, gain: 0.018, ms: 12 });
    return;
  }
  // impact / default tap
  if (!vibrate(12)) playClick({ freq: 160, gain: 0.03, ms: 16 });
}

/** Light detent while turning the dial. */
export function hapticTick() {
  pulse('tick');
}

/** Stronger detent (e.g. every 5 dB). */
export function hapticMajor() {
  pulse('major');
}

/** Hard stop at min/max volume. */
export function hapticEndstop() {
  pulse('endstop');
}

/** Finger down on the dial. */
export function hapticGrab() {
  pulse('grab');
}

/** Finger up after a drag. */
export function hapticRelease() {
  pulse('release');
}

/** Mute, source change, and other discrete actions. */
export function hapticImpact() {
  pulse('impact');
}

/** @deprecated Prefer named helpers; kept for simple call sites. */
export function haptic() {
  hapticImpact();
}
