'use client';

import { useEffect } from 'react';
import { offlineActionQueue } from '@/lib/offlineActionQueue';
import { sendRemoteLog } from '@/lib/remoteLogger';

/**
 * Rejestruje Service Worker dla PWA.
 * Komponent "use client" — wrzucony w root layout.
 *
 * Obsługuje:
 * - Rejestrację SW z opóźnieniem
 * - Background Sync (SyncManager API) jeśli dostępny
 * - Wiadomości `FLUSH_OFFLINE_QUEUE` z SW
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // Rejestracja z opóźnieniem — nie blokujemy pierwszego renderu
      const timer = setTimeout(() => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => {
            // eslint-disable-next-line no-console -- Service Worker registration status is intentionally logged
            console.log('[SW] Registered:', reg.scope);

            // Rejestracja Background Sync (jeśli dostępne)
            const swReg = reg as ServiceWorkerRegistration & { sync?: { register: (tag: string) => Promise<void> } };
            if (swReg.sync && typeof swReg.sync.register === 'function') {
              swReg.sync.register('werkit-flush-queue').catch(() => {
                // SyncManager może nie być dostępny we wszystkich przeglądarkach
              });
            }
          })
          .catch((err) => {
            console.warn('[SW] Registration failed:', err);
          });
      }, 2000);

      // Nasłuchuj wiadomości od SW (np. FLUSH_OFFLINE_QUEUE)
      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === 'FLUSH_OFFLINE_QUEUE') {
          sendRemoteLog('INFO', 'SW: received FLUSH_OFFLINE_QUEUE, flushing queue', undefined, { category: 'session' });
          offlineActionQueue.flushAll().catch(() => {});
        }
      };

      navigator.serviceWorker.addEventListener('message', handleMessage);

      return () => {
        clearTimeout(timer);
        navigator.serviceWorker.removeEventListener('message', handleMessage);
      };
    }
  }, []);

  return null;
}
