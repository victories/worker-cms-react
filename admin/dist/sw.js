// Worker CMS admin — minimal service worker.
//
// Scope is /admin/ (it is served from /admin/sw.js), so it only ever sees
// admin SPA requests — never /api/* — which keeps API data from being
// cached/staled. Strategy:
//   - /admin/assets/*  (hashed, immutable) → cache-first (fast, offline)
//   - everything else under /admin/        → network-first, fall back to
//     cache (so the live app shell is always fresh online, usable offline)
const CACHE = 'wcms-admin-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith('/admin/')) return;

  if (url.pathname.startsWith('/admin/assets/')) {
    event.respondWith(cacheFirst(req));
  } else {
    event.respondWith(networkFirst(req));
  }
});

async function cacheFirst(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res && res.ok) cache.put(req, res.clone());
  return res;
}

async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(req);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    const hit = (await cache.match(req)) || (await cache.match('/admin/'));
    if (hit) return hit;
    throw err;
  }
}
