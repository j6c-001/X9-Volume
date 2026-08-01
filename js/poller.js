import { getMsgCount, syncData } from './api.js';
import { state, setState, mergeFromServer } from './state.js';

const POLL_MS = 400;
/** Cap hung LAN probes so a powered-off X9 cannot stall the poller for minutes. */
const REQUEST_TIMEOUT_MS = 1500;
const FAIL_BEFORE_OFFLINE = 3;

let timer = null;
let lastMsgCount = null;
let abortController = null;
let running = false;

function clearTimer() {
  if (timer) clearTimeout(timer);
  timer = null;
}

function scheduleNext() {
  clearTimer();
  if (!running) return;
  timer = setTimeout(tick, POLL_MS);
}

/**
 * Run a device request with an abortable timeout.
 * Timeout failures reject with a normal Error so they count toward offline.
 * Cancels from stop/forceSync stay AbortError and are ignored by the poller.
 */
async function withTimeout(run) {
  abortController?.abort();
  abortController = new AbortController();
  const { signal } = abortController;
  let timedOut = false;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    abortController?.abort();
  }, REQUEST_TIMEOUT_MS);

  try {
    return await run(signal);
  } catch (e) {
    if (e.name === 'AbortError' && timedOut) {
      throw new Error('device request timeout');
    }
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function tick() {
  if (!running) return;

  if (document.hidden || !state.ip) {
    scheduleNext();
    return;
  }

  try {
    const count = await withTimeout((signal) => getMsgCount(state.ip, signal));

    setState({ connected: true, failures: 0 });

    if (lastMsgCount === null || count !== lastMsgCount) {
      lastMsgCount = count;
      const data = await withTimeout((signal) => syncData(state.ip, signal));
      mergeFromServer(data);
    }
  } catch (e) {
    if (e.name === 'AbortError') {
      // Superseded by stop/reset/forceSync — only continue if still running.
      scheduleNext();
      return;
    }
    const failures = state.failures + 1;
    setState({
      failures,
      connected: failures < FAIL_BEFORE_OFFLINE,
    });
  }

  scheduleNext();
}

export function startPoller() {
  stopPoller();
  if (!state.ip) return;
  running = true;
  tick();
}

export function stopPoller() {
  running = false;
  clearTimer();
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
    const data = await withTimeout((signal) => syncData(state.ip, signal));
    if (data.msgCount != null) lastMsgCount = data.msgCount;
    mergeFromServer(data, true);
    setState({ connected: true, failures: 0 });
    return data;
  } catch (_) {
    return null;
  }
}
