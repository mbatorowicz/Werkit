/**
 * Service Worker dla Werkit PWA.
 * Zapewnia podstawowe wsparcie offline dla assetów statycznych.
 *
 * Strategia: Cache-First dla assetów (JS, CSS, fonts, icons),
 * Network-First dla API i stron (z fallbackiem do cache).
 *
 * Rejestracja: automatyczna w `src/components/ServiceWorkerRegister.tsx`
 */

const CACHE_NAME = 'werkit-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/sounds/werkit_alert.wav',
  '/sounds/werkit_sound_bell.wav',
  '/sounds/werkit_sound_chime.wav',
  '/sounds/werkit_sound_soft.wav',
  '/sounds/werkit_sound_urgent.wav',
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

  // API — Network First z fallbackiem do cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstWithFallback(request));
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

  // Strony (nawigacja) — Network First
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithFallback(request));
    return;
  }
});

async function cacheFirst(request: Request): Promise<Response> {
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

async function networkFirstWithFallback(request: Request): Promise<Response> {
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
