/** How often an open app rechecks for a new service worker. */
const UPDATE_INTERVAL_MS = 30 * 60 * 1000;

/**
 * Register the SW and keep installed clients current:
 * - recheck on launch, on foreground, and on an interval
 * - reload once when a new worker takes control (after deploy)
 */
export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;

  const hadController = !!navigator.serviceWorker.controller;
  const swUrl = new URL('../sw.js', import.meta.url);
  const reg = await navigator.serviceWorker.register(swUrl, { type: 'module' });

  const checkForUpdate = () => {
    reg.update().catch(() => {});
  };

  checkForUpdate();
  setInterval(checkForUpdate, UPDATE_INTERVAL_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkForUpdate();
  });

  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // First install claims the page — don't bounce. Updates should reload.
    if (!hadController || refreshing) return;
    refreshing = true;
    location.reload();
  });

  return reg;
}
