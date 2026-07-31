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
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  // Navigations: try network first so a deploy is picked up quickly when online.
  if (e.request.mode === 'navigate') {
    e.respondWith(networkFirst(e.request));
    return;
  }

  e.respondWith(cacheFirst(e.request));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const res = await fetch(request);
    if (res.ok && request.method === 'GET') {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(request, copy));
    }
    return res;
  } catch (_) {
    return new Response('Offline', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

async function networkFirst(request) {
  try {
    const res = await fetch(request);
    if (res.ok) {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(request, copy));
    }
    return res;
  } catch (_) {
    const cached = await caches.match(request);
    if (cached) return cached;
    const fallback = await caches.match(asset('index.html'));
    if (fallback) return fallback;
    return new Response('Offline', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}
