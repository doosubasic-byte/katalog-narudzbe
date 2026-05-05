const CACHE_NAME = "katalog-v1";

const CORE_FILES = [
  "./",
  "./index.html",
  "./app.js",
  "./manifest.json",
  "./products.csv",
  "./no-image.png"
];

// INSTALL – cache osnovu
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_FILES))
  );
  self.skipWaiting();
});

// ACTIVATE
self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim());
});

// FETCH – cache EVERYTHING that is fetched (including images)
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        // samo validne response cache-irati
        if (
          response &&
          response.status === 200 &&
          response.type === "basic"
        ) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      });
    })
  );
});
