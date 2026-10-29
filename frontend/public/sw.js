const CACHE_NAME = 'climateguard-shell-v1';
const OFFLINE_URL = '/offline.html';
const ASSET_URLS = ['/', '/offline.html', '/manifest.webmanifest', '/icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSET_URLS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(OFFLINE_URL).then((cached) => cached ?? caches.match('/'))),
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (response.ok && !event.request.url.includes('/api/')) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => caches.match(OFFLINE_URL));
    }),
  );
});

self.addEventListener('push', (event) => {
  const payload = event.data?.json() ?? {
    title: 'ClimateGuard AI',
    body: 'A new risk alert is ready to review.',
  };

  event.waitUntil(
    self.registration.showNotification(payload.title || 'ClimateGuard AI', {
      body: payload.body || 'New climate alert',
      icon: '/icon.svg',
      badge: '/icon.svg',
    }),
  );
});
