const CACHE_NAME = 'diet-planner-cache-v2';
const urlsToCache = [
  '/',
  'index.html',
  'manifest.json',
  'assets/icons/icon-192x192.png',
  'assets/icons/icon-512x512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))
      );
    })
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension://')) {
      return;
  }
    
  event.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      return cache.match(event.request).then(response => {
        const fetchPromise = fetch(event.request).then(networkResponse => {
          // Do not cache google sign-in scripts or API calls to prevent auth issues
          if (!event.request.url.includes('google.com') && !event.request.url.includes('googleapis.com')) {
              cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        });

        // Return cached response if available, and fetch update in background.
        // Otherwise, return the fetch promise (and wait for network).
        return response || fetchPromise;
      });
    })
  );
});