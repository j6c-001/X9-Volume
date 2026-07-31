import { getMsgCount, syncData } from './api.js';
import { state, setState, mergeFromServer } from './state.js';

const POLL_MS = 400;

let timer = null;
let lastMsgCount = null;
let abortController = null;

async function tick() {

  if (document.hidden || !state.ip) {
    timer = setTimeout(tick, POLL_MS);
    return;
  }

  try {
    abortController?.abort();
    abortController = new AbortController();
    const count = await getMsgCount(state.ip, abortController.signal);

    setState({ connected: true, failures: 0 });

    if (lastMsgCount === null || count !== lastMsgCount) {
      lastMsgCount = count;
      const data = await syncData(state.ip, abortController.signal);
      mergeFromServer(data);
    }
  } catch (e) {
    if (e.name === 'AbortError') {
      timer = setTimeout(tick, POLL_MS);
      return;
    }
    const failures = state.failures + 1;
    setState({
      failures,
      connected: failures < 3,
    });
  }

  timer = setTimeout(tick, POLL_MS);
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

export async function forceSync() {
  if (!state.ip) return null;
  try {
    abortController?.abort();
    abortController = new AbortController();
    const data = await syncData(state.ip, abortController.signal);
    if (data.msgCount != null) lastMsgCount = data.msgCount;
    mergeFromServer(data, true);
    setState({ connected: true, failures: 0 });
    return data;
  } catch (_) {
    return null;
  }
}
