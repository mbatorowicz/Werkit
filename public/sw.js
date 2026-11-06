/**
 * Cache only public, account-independent assets. Authenticated API, HTML and
 * RSC responses must never be shared between users through Cache Storage.
 * Durable pending mutations/GPS live separately in IndexedDB.
 */
const CACHE_NAME = "werkit-public-v6";
const STATIC_ASSETS = [
  "/favicon.ico",
  "/icons/favicon-32.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/sounds/werkit_alert.wav",
  "/sounds/werkit_sound_bell.wav",
  "/sounds/werkit_sound_chime.wav",
  "/sounds/werkit_sound_soft.wav",
  "/sounds/werkit_sound_urgent.wav",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await Promise.all(
        STATIC_ASSETS.map(async (path) => {
          try {
            const response = await fetch(path, { cache: "no-store" });
            if (response.ok && !response.redirected) await cache.put(path, response);
          } catch {
            /* A missing optional public asset must not block installation. */
          }
        })
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Remove legacy mixed caches before controlling any clients. Do not touch
      // IndexedDB queues, or caches owned by unrelated applications on this origin.
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith("werkit-") && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || request.method !== "GET") return;

  if (url.pathname.startsWith("/_next/static/") || STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }
  // Explicitly bypass HTTP cache as well. 401/403/redirects are returned as-is;
  // neither a failed request nor a denied request can revive another user's data.
  event.respondWith(networkOnly(request));
});

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok && !response.redirected) await cache.put(request, response.clone());
    return response;
  } catch {
    return new Response("Offline", { status: 503 });
  }
}

async function networkOnly(request) {
  try {
    return await fetch(request, { cache: "no-store" });
  } catch {
    // No cached HTML fallback: server-rendered pages contain account data too.
    if (request.mode === "navigate") {
      return new Response(
        '<!DOCTYPE html><html lang="pl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline - Werkit</title></head><body><h1>Brak połączenia</h1><p>Werkit wymaga dostępu do internetu.<br>Sprawdź swoje połączenie i spróbuj ponownie.</p></body></html>',
        {
          status: 503,
          headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
        }
      );
    }
    return new Response(JSON.stringify({ error: "offline" }), {
      status: 503,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }
}

self.addEventListener("sync", (event) => {
  if (event.tag === "werkit-flush-queue") event.waitUntil(flushOfflineQueue());
});

async function flushOfflineQueue() {
  const clients = await self.clients.matchAll();
  for (const client of clients) client.postMessage({ type: "FLUSH_OFFLINE_QUEUE" });
}
