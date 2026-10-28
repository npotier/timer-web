// Cache-first offline shell (research.md §6). No backend/API to keep fresh, so a simple
// precache + cache-first strategy is sufficient (constitution Principle V: simplest correct
// approach). Bump CACHE_NAME to force old caches to be dropped on the next activate.
const CACHE_NAME = 'timerweb-shell-v2';

const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './css/input.css',
  './js/app.js',
  './js/timer-engine.js',
  './js/storage.js',
  './js/audio.js',
  './js/haptics.js',
  './js/wakelock.js',
  './js/views/session-view.js',
  './js/views/editor-view.js',
  './js/views/settings-view.js',
  './js/views/history-view.js',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
    })
  );
});
