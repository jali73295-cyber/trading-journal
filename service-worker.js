/* ============================================================
   TradeLog Pro — service worker
   Precaches the app shell so the journal works fully offline.
   Bump VERSION whenever you edit any file, so clients update.
   ============================================================ */
const VERSION = 'v1.0.14';
const CACHE = 'tradelog-' + VERSION;

const ASSETS = [
  './',
  './index.html',
  './dashboard.html',
  './trade.html',
  './statistics.html',
  './gallery.html',
  './settings.html',
  './style.css',
  './script.js',
  './manifest.json',
  './storage.js',
  './images.js',
  './ai.js',
  './importer.js',
  './metrics.js',
  './ui.js',
  './charts.js',
  './journal.js',
  './dashboard.js',
  './trade.js',
  './statistics.js',
  './gallery.js',
  './settings.js',
  './chart.umd.min.js',
  './favicon.svg',
  './favicon-32.png',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => Promise.allSettled(ASSETS.map(u => cache.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Google Fonts: stale-while-revalidate so the display font works offline too
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.open(CACHE).then(cache =>
        cache.match(req).then(hit => {
          const fresh = fetch(req).then(res => { cache.put(req, res.clone()); return res; }).catch(() => hit);
          return hit || fresh;
        })
      )
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  // Same-origin: cache-first, network fallback (and cache what we fetch)
  event.respondWith(
    caches.match(req).then(hit => {
      if (hit) return hit;
      return fetch(req).then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(cache => cache.put(req, copy));
        }
        return res;
      }).catch(() => {
        if (req.mode === 'navigate') return caches.match('./index.html');
      });
    })
  );
});
