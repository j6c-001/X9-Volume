/**
 * Tactile feedback for the volume dial.
 * Prefers the Vibration API on Android Chrome; always layers a short Web Audio
 * click so feedback is still felt/heard when vibrate is blocked, too short for
 * the motor, or unavailable (iOS).
 */

let audioCtx = null;
let lastPulseAt = 0;
let vibrateBlocked = false;

function canVibrate() {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

/**
 * @returns {boolean} true only when the browser accepted the vibration request.
 * Chrome returns false without sticky user activation, in a hidden document, etc.
 */
function vibrate(pattern) {
  if (!canVibrate() || vibrateBlocked) return false;
  try {
    // Do not call vibrate(0) first — cancelling immediately before a short pulse
    // can drop the pulse on some Android builds.
    const ok = navigator.vibrate(pattern);
    if (!ok) vibrateBlocked = true;
    return !!ok;
  } catch (_) {
    vibrateBlocked = true;
    return false;
  }
}

/** Clear the blocked latch after a fresh user gesture (pointerdown). */
export function armHaptics() {
  vibrateBlocked = false;
  ensureAudio();
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
  const minGap = kind === 'tick' ? 16 : kind === 'major' ? 22 : 0;
  if (minGap && now - lastPulseAt < minGap) return;
  lastPulseAt = now;

  // Android vibration motors rarely register sub-~20ms pulses. Use longer
  // durations, and always reinforce with a soft click (vibrate can report
  // success yet still be suppressed by DND / battery saver).
  if (kind === 'tick') {
    vibrate(28);
    playClick({ freq: 250, gain: 0.028, ms: 14 });
    return;
  }
  if (kind === 'major') {
    vibrate(42);
    playClick({ freq: 180, gain: 0.04, ms: 20 });
    return;
  }
  if (kind === 'endstop') {
    vibrate([35, 40, 50]);
    playClick({ freq: 110, gain: 0.05, ms: 30 });
    return;
  }
  if (kind === 'grab') {
    vibrate(32);
    playClick({ freq: 150, gain: 0.024, ms: 16 });
    return;
  }
  if (kind === 'release') {
    vibrate(24);
    playClick({ freq: 200, gain: 0.02, ms: 12 });
    return;
  }
  vibrate(36);
  playClick({ freq: 160, gain: 0.034, ms: 18 });
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
