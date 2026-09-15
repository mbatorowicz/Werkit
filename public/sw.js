/**
 * Service Worker dla Werkit PWA.
 * Zapewnia wsparcie offline dla assetów statycznych oraz danych API.
 *
 * Strategie:
 * - Cache-First dla assetów (JS, CSS, fonts, icons, sounds)
 * - Network-First dla API worker (sesja / zlecenia / ustawienia — bez stale-while-revalidate)
 * - Network-First dla nawigacji
 * - Background Sync dla operacji offline (jeśli SyncManager dostępny)
 *
 * Rejestracja: automatyczna w `src/components/ServiceWorkerRegister.tsx`
 */

const CACHE_NAME = "werkit-v5";
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

const WORKER_API_CACHE_PATHS = [
  "/api/worker/session",
  "/api/worker/work-orders",
  "/api/worker/settings",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        STATIC_ASSETS.map((url) =>
          cache.add(url).catch(() => {
            // Jeden 404 nie może zablokować instalacji SW.
          }),
        ),
      ),
    ),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  if (request.method === "GET" && isWorkerApiPath(url.pathname)) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    return;
  }

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (url.pathname.match(/\.(webp|png|jpg|jpeg|gif|svg|ico|wav|mp3|woff2?|css|js)$/)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirstWithFallback(request));
  }
});

function isWorkerApiPath(pathname) {
  return WORKER_API_CACHE_PATHS.some((prefix) => pathname.startsWith(prefix));
}

function withSwCacheHeader(response) {
  const headers = new Headers(response.headers);
  headers.set("X-Werkit-Sw-Cache", "1");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("Offline", { status: 503 });
  }
}

/** Network-first: żywe dane sesji; cache tylko gdy sieć padnie. */
async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return withSwCacheHeader(cached);
    return new Response(JSON.stringify({ error: "offline" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function networkFirstWithFallback(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (request.mode === "navigate") {
      return new Response(
        '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline - Werkit</title><style>body{font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#09090b;color:#e4e4e7}.card{text-align:center;padding:2rem}h1{font-size:1.5rem;margin-bottom:0.5rem}p{color:#a1a1aa}</style></head><body><div class="card"><h1>Brak połączenia</h1><p>Werkit wymaga dostępu do internetu.<br>Sprawdź swoje połączenie i spróbuj ponownie.</p></div></body></html>',
        {
          status: 503,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        },
      );
    }
    return new Response("Offline", { status: 503 });
  }
}

self.addEventListener("sync", (event) => {
  if (event.tag === "werkit-flush-queue") {
    event.waitUntil(flushOfflineQueue());
  }
});

async function flushOfflineQueue() {
  const clients = await self.clients.matchAll();
  for (const client of clients) {
    client.postMessage({ type: "FLUSH_OFFLINE_QUEUE" });
  }
}
