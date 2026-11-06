importScripts("https://progressier.app/XFqUZReQfNadYZlb1APV/sw.js");

// SPA navigation fallback: intercept navigation requests and fallback to /index.html on 404 or offline
self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (!response || response.status === 404) {
            return caches.match("/index.html").then((cached) => cached || fetch("/index.html"));
          }
          return response;
        })
        .catch(() => caches.match("/index.html").then((cached) => cached || caches.match("/")))
    );
  }
});
