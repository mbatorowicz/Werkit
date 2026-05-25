'use client';

import { useEffect } from 'react';

/**
 * Rejestruje Service Worker dla PWA.
 * Komponent "use client" — wrzucony w root layout.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // Rejestracja z opóźnieniem — nie blokujemy pierwszego renderu
      const timer = setTimeout(() => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => {
            console.log('[SW] Registered:', reg.scope);
          })
          .catch((err) => {
            console.warn('[SW] Registration failed:', err);
          });
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, []);

  return null;
}
