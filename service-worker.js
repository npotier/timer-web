// Network-first offline shell (research.md §6, revised). Cache-first was tried first but it never
// revalidates against the network once a URL is cached, so app updates silently stopped reaching
// returning visitors until this file's own bytes happened to change too. Network-first fixes that:
// online visitors always get the latest deployed files, while offline visitors (or a failed fetch)
// fall back to whatever was last cached — satisfying FR-019/SC-005 without the staleness bug.
// Bump CACHE_NAME to force old cache entries to be dropped on the next activate.
const CACHE_NAME = 'timerweb-shell-v3';

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
  './js/icons.js',
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
    fetch(event.request)
      .then((response) => {
        if (response && response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
