/**
 * debuga.ai - Service Worker (PWA)
 * 
 * Cache strategy: Cache static assets only.
 * NEVER cache: API routes, auth, Stripe, streaming, user data.
 */

const CACHE_NAME = "debuga-v1";

// Static assets to pre-cache on install
const PRECACHE_URLS = [
  "/",
  "/manifest.webmanifest",
];

// Patterns that should NEVER be cached
const NEVER_CACHE = [
  /\/api\//,           // All API routes (tRPC, auth, Stripe webhook)
  /\/trpc\//,          // tRPC calls
  /\/stripe/,          // Stripe routes
  /\/oauth/,           // OAuth routes
  /\/auth/,            // Auth routes
  /\/stream/,          // SSE streaming
  /\/upload/,          // File uploads
  /\/transcribe/,      // Voice transcription
  /chrome-extension/,  // Browser extensions
  /hot-update/,        // Vite HMR
  /sockjs/,            // WebSocket
  /\/__vite/,          // Vite dev
];

// Cacheable static asset extensions
const CACHEABLE_EXTENSIONS = /\.(js|css|woff2?|ttf|eot|png|jpg|jpeg|webp|svg|ico|json)$/;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch(() => {
        // Silently fail pre-cache - app works without it
        console.log("[SW] Pre-cache partially failed, continuing...");
      });
    })
  );
  // Activate immediately without waiting for old SW to finish
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  // Take control of all clients immediately
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== "GET") return;

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // NEVER cache sensitive routes
  if (NEVER_CACHE.some((pattern) => pattern.test(url.pathname))) return;

  // Navigation requests (HTML pages): network-first, no cache
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => {
        // If offline, try to serve cached index for SPA routing
        return caches.match("/");
      })
    );
    return;
  }

  // Static assets: stale-while-revalidate
  if (CACHEABLE_EXTENSIONS.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request)
          .then((response) => {
            // Only cache successful responses
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, clone);
              });
            }
            return response;
          })
          .catch(() => cached); // Fallback to cache if network fails

        return cached || fetchPromise;
      })
    );
    return;
  }

  // Everything else: network only (no cache)
});
