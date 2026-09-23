/**
 * service-worker.js - offline support for Development Discourses
 *
 * Strategy:
 *   - App shell (HTML/CSS/JS/icons): cache-first, updated in the background.
 *   - Data (data/*.json): network-first, falling back to cache when offline.
 * Bump CACHE_VERSION to invalidate old caches on the next visit.
 *
 * The shell is cache-first, so this is not optional housekeeping: a returning
 * visitor keeps the cached HTML, CSS and JS until a bump evicts them. The
 * 2026-09-23 change added markup (#linkNote, #altUrls, .detail-topics) that
 * only the new JS fills and only the new CSS styles, so leaving the version
 * alone would have paired new markup with old script on every device that had
 * already visited. Nothing would error; the link-health line would simply not
 * appear, and only a first-time visitor would ever see the feature. Hence v4.
 */

const CACHE_VERSION = 'dd-v4';
const SHELL_CACHE = CACHE_VERSION + '-shell';
const DATA_CACHE = CACHE_VERSION + '-data';

const SHELL_ASSETS = [
  './',
  './index.html',
  './resource.html',
  './css/impactmojo-kit.css',
  './css/style.css',
  './js/app.js',
  './js/resource.js',
  './js/litmap.js',
  './icon.svg',
  './manifest.webmanifest',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then(cache => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
      .catch(() => {})
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => !k.startsWith(CACHE_VERSION)).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Only handle same-origin requests; let the browser deal with fonts/CDNs.
  if (url.origin !== self.location.origin) return;

  const isData = url.pathname.includes('/data/') && url.pathname.endsWith('.json');

  if (isData) {
    // Network-first for data so the library stays fresh.
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(DATA_CACHE).then(c => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Cache-first for the app shell.
  event.respondWith(
    caches.match(req).then(cached => {
      const network = fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then(c => c.put(req, copy));
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
