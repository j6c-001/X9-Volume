import { APP_VERSION } from './js/version.js';

const CACHE = `x9-volume-${APP_VERSION}`;

function asset(path) {
  return new URL(path, import.meta.url).href;
}

const ASSETS = [
  'index.html',
  'css/app.css',
  'js/app.js',
  'js/api.js',
  'js/codec.js',
  'js/state.js',
  'js/poller.js',
  'js/knob.js',
  'js/config.js',
  'js/theme.js',
  'js/sources.js',
  'js/outputs.js',
  'js/io-selector.js',
  'js/gain.js',
  'js/vu.js',
  'js/haptics.js',
  'js/update.js',
  'js/version.js',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
].map(asset);

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  // App shell (HTML/JS/CSS): network first so browser tabs see deploys.
  // Icons/manifest stay cache-first; offline still falls back to precache.
  if (e.request.mode === 'navigate' || isAppShell(url)) {
    e.respondWith(networkFirst(e.request, { navigateFallback: e.request.mode === 'navigate' }));
    return;
  }

  e.respondWith(cacheFirst(e.request));
});

function isAppShell(url) {
  const path = url.pathname;
  return path.endsWith('.html') || path.endsWith('.js') || path.endsWith('.css');
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const res = await fetch(request);
    if (res.ok) {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(request, copy));
    }
    return res;
  } catch (_) {
    return offlineResponse();
  }
}

async function networkFirst(request, { navigateFallback = false } = {}) {
  try {
    // Revalidate with the network/CDN so GitHub Pages HTTP cache cannot
    // keep serving a stale app shell while the SW thinks it "went to network".
    const res = await fetch(request, { cache: 'no-cache' });
    if (res.ok) {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(request, copy));
    }
    return res;
  } catch (_) {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (navigateFallback) {
      const fallback = await caches.match(asset('index.html'));
      if (fallback) return fallback;
    }
    return offlineResponse();
  }
}

function offlineResponse() {
  return new Response('Offline', {
    status: 503,
    headers: { 'Content-Type': 'text/plain' },
  });
}
