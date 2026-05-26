/**
 * Service Worker dla Werkit PWA.
 * Zapewnia wsparcie offline dla assetów statycznych oraz danych API.
 *
 * Strategie:
 * - Cache-First dla assetów (JS, CSS, fonts, icons, sounds)
 * - Stale-While-Revalidate dla API worker (szybkie ładowanie + offline fallback)
 * - Network-First dla API admin i nawigacji
 * - Background Sync dla operacji offline (jeśli SyncManager dostępny)
 *
 * Rejestracja: automatyczna w `src/components/ServiceWorkerRegister.tsx`
 */

const CACHE_NAME = 'werkit-v2';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/sounds/werkit_alert.wav',
  '/sounds/werkit_sound_bell.wav',
  '/sounds/werkit_sound_chime.wav',
  '/sounds/werkit_sound_soft.wav',
  '/sounds/werkit_sound_urgent.wav',
];

// Endpointy API worker które mogą być cache'owane (GET)
const WORKER_API_CACHE_PATHS = [
  '/api/worker/session',
  '/api/worker/work-orders',
  '/api/worker/settings',
];

// Instalacja — pre-cache assetów statycznych
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }),
  );
  self.skipWaiting();
});

// Aktywacja — czyszczenie starych cache'y
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      );
    }),
  );
  self.clients.claim();
});

// Fetch — strategia hybrydowa
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Tylko własny origin
  if (url.origin !== self.location.origin) return;

  // API worker (GET) — Stale-While-Revalidate
  if (request.method === 'GET' && isWorkerApiPath(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // API (POST/PUT/DELETE) — Network only, nie cache'ujemy
  if (url.pathname.startsWith('/api/')) {
    // Dla zapytań innych niż GET — przepuszczamy bez cache
    return;
  }

  // Next.js assety (_next/static) — Cache First
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Asset statyczne (icons, sounds, images) — Cache First
  if (
    url.pathname.match(/\.(webp|png|jpg|jpeg|gif|svg|ico|wav|mp3|woff2?|css|js)$/)
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Strony (nawigacja) — Network First z fallbackiem do cache
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithFallback(request));
    return;
  }
});

function isWorkerApiPath(pathname) {
  return WORKER_API_CACHE_PATHS.some((prefix) => pathname.startsWith(prefix));
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
    return new Response('Offline', { status: 503 });
  }
}

/**
 * Stale-While-Revalidate: zwraca z cache natychmiast (jeśli istnieje),
 * a w tle aktualizuje cache z sieci. Działa offline — pokazuje ostatnie dane.
 */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => {
      // Sieć niedostępna — zwróć cached response (może być null)
      return cachedResponse;
    });

  // Jeśli mamy cache — zwróć go natychmiast, ale też czekaj na fetch
  if (cachedResponse) {
    // W tle aktualizuj cache
    fetchPromise.catch(() => {});
    return cachedResponse;
  }

  // Brak cache — czekaj na fetch
  return fetchPromise;
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
    // Dla nawigacji — zwróć offline page
    if (request.mode === 'navigate') {
      return new Response(
        '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline - Werkit</title><style>body{font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#09090b;color:#e4e4e7}.card{text-align:center;padding:2rem}.icon{font-size:4rem;margin-bottom:1rem}h1{font-size:1.5rem;margin-bottom:0.5rem}p{color:#a1a1aa}</style></head><body><div class="card"><div class="icon">📡</div><h1>Brak połączenia</h1><p>Werkit wymaga dostępu do internetu.<br>Sprawdź swoje połączenie i spróbuj ponownie.</p></div></body></html>',
        {
          status: 503,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        },
      );
    }
    return new Response('Offline', { status: 503 });
  }
}

// ─── Background Sync ─────────────────────────────────────────────────────────
// Rejestrujemy sync event — jeśli przeglądarka wspiera SyncManager,
// po powrocie online wywoła 'sync' event, który poinformuje klienta o flush.

self.addEventListener('sync', (event) => {
  if (event.tag === 'werkit-flush-queue') {
    event.waitUntil(flushOfflineQueue());
  }
});

async function flushOfflineQueue() {
  // Wyślij wiadomość do wszystkich klientów (okien) żeby wykonały flush
  const clients = await self.clients.matchAll();
  for (const client of clients) {
    client.postMessage({ type: 'FLUSH_OFFLINE_QUEUE' });
  }
}
