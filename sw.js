const CACHE = 'x9-volume-v8';

function asset(path) {
  return new URL(path, self.location).href;
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
  'js/source-selector.js',
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

  e.respondWith((async () => {
    const cached = await caches.match(e.request);
    if (cached) return cached;

    try {
      const res = await fetch(e.request);
      if (res.ok && e.request.method === 'GET') {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
      }
      return res;
    } catch (_) {
      if (e.request.mode === 'navigate') {
        const fallback = await caches.match(asset('index.html'));
        if (fallback) return fallback;
      }
      return new Response('Offline', {
        status: 503,
        headers: { 'Content-Type': 'text/plain' },
      });
    }
  })());
});
