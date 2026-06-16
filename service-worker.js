// The service worker is a background script the browser runs separately.
// Its job: save copies of the app's files so it still works with no internet.

const CACHE_NAME = 'times-tables-v2';

// The list of files to save on first load
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './config.js',
  './manifest.json',
];

// INSTALL — runs once when the service worker is first registered.
// We open a cache and store all the app files in it.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  // Take over immediately without waiting for old tabs to close
  self.skipWaiting();
});

// ACTIVATE — runs after install. We delete any old caches from previous versions.
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// FETCH — every time the app requests a file, this intercepts it.
// We return the cached copy if we have one; otherwise we fetch from the network.
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
