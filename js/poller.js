import { getMsgCount, syncData } from './api.js';
import { state, setState, mergeFromServer } from './state.js';

let timer = null;
let lastMsgCount = null;
let abortController = null;

async function tick() {
  const interval = state.poweredOff ? 2000 : 400;

  if (document.hidden || !state.ip) {
    timer = setTimeout(tick, interval);
    return;
  }

  try {
    abortController?.abort();
    abortController = new AbortController();
    const count = await getMsgCount(state.ip, abortController.signal);

    if (state.poweringOff) {
      timer = setTimeout(tick, interval);
      return;
    }

    setState({ connected: true, failures: 0, poweredOff: false });

    if (lastMsgCount === null || count !== lastMsgCount) {
      lastMsgCount = count;
      const data = await syncData(state.ip, abortController.signal);
      mergeFromServer(data);
    }
  } catch (e) {
    if (e.name === 'AbortError') {
      timer = setTimeout(tick, interval);
      return;
    }
    const failures = state.failures + 1;
    setState({
      failures,
      connected: failures < 3 && !state.poweredOff,
    });
  }

  timer = setTimeout(tick, interval);
}

export function startPoller() {
  stopPoller();
  if (!state.ip) return;
  tick();
}

export function stopPoller() {
  if (timer) clearTimeout(timer);
  timer = null;
  abortController?.abort();
  abortController = null;
}

export function resetPoller() {
  lastMsgCount = null;
  startPoller();
}
