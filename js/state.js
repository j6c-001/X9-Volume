const listeners = new Set();

export const state = {
  ip: localStorage.getItem('x9-device-ip') || '',
  connected: false,
  device: 'Luxsin-X9',
  title: 'Luxsin-X9',
  input: 0,
  audioFormat: '',
  version: '',
  volume: 100,
  soundStep: 0,
  muted: false,
  dragging: false,
  togglingMute: false,
  selectingVu: false,
  vu: 0,
  vuCount: 16,
  failures: 0,
  msgCount: null,
};

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function emit() {
  for (const fn of listeners) fn(state);
}

export function setState(partial) {
  Object.assign(state, partial);
  emit();
}

export function mergeFromServer(data, force = false) {
  if (!force && (state.dragging || state.togglingMute)) return;

  const title = data.input === 4 && data.bt_title
    ? data.bt_title
    : (data.device || 'Luxsin-X9');

  const next = {
    connected: true,
    failures: 0,
    device: data.device || state.device,
    title,
    input: data.input ?? state.input,
    audioFormat: data.audioFormat || '',
    version: data.version ?? state.version,
    volume: data.volume ?? state.volume,
    soundStep: data.soundStep ?? state.soundStep,
    muted: !!data.isDacMetuVolume,
    msgCount: data.msgCount ?? state.msgCount,
  };

  if (!state.selectingVu) {
    if (data.vu != null) next.vu = Math.max(0, data.vu | 0);
    if (data.vu_count != null) next.vuCount = Math.max(1, data.vu_count | 0);
  }

  setState(next);
}

