import { getMsgCount, syncData, usesLocalNetworkPermission } from './api.js';
import { state, setState, mergeFromServer } from './state.js';

let timer = null;
let lastMsgCount = null;
let abortController = null;

function pollInterval() {
  if (!usesLocalNetworkPermission()) return 400;
  if (state.failures >= 10) return 5000;
  if (state.failures >= 3) return 2000;
  return 400;
}

async function tick() {
  const interval = pollInterval();

  if (document.hidden || !state.ip) {
    timer = setTimeout(tick, interval);
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
      timer = setTimeout(tick, interval);
      return;
    }
    const failures = state.failures + 1;
    setState({
      failures,
      connected: failures < 3,
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
