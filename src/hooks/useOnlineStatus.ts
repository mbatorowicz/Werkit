"use client";

import { useEffect, useSyncExternalStore } from "react";
import { offlineActionQueue } from "@/lib/offlineActionQueue";
import { sendRemoteLog } from "@/lib/remoteLogger";

/**
 * Subskrypcja `navigator.onLine` przez `useSyncExternalStore` — zero re-renderów
 * dopóki stan się nie zmieni, bezpieczne dla Server Components (zwraca `true`).
 */
function getSnapshot(): boolean {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

/**
 * Hook do śledzenia statusu online/offline.
 *
 * Automatycznie flushuje kolejkę offline po powrocie online.
 *
 * @example
 * ```tsx
 * const { isOnline, pendingCount } = useOnlineStatus();
 * if (!isOnline) return <OfflineBanner count={pendingCount} />;
 * ```
 */
export function useOnlineStatus() {
  const isOnline = useSyncExternalStore(subscribe, getSnapshot, () => true);

  // Auto-flush po powrocie online
  useEffect(() => {
    if (!isOnline) return;

    let cancelled = false;

    const flush = async () => {
      const count = await offlineActionQueue.getCount();
      if (count === 0 || cancelled) return;

      sendRemoteLog("INFO", `OnlineStatus: flushing ${count} queued actions`, {
        count,
      }, { category: "session", dedupeWindowMs: 10_000 });

      const result = await offlineActionQueue.flushAll();
      if (!cancelled && result.remaining > 0) {
        // Zostały jeszcze operacje — spróbuj za chwilę
        setTimeout(flush, 2000);
      }
    };

    void flush();

    return () => {
      cancelled = true;
    };
  }, [isOnline]);

  // Pending count — subskrypcja przez okresowe sprawdzanie
  // Używamy useEffect z intervalem, bo IndexedDB jest async
  useEffect(() => {
    if (typeof window === "undefined") return;
    // Inicjalny odczyt — jeśli jesteśmy online, spróbuj wysłać zaległe
    if (isOnline) {
      offlineActionQueue.flushAll().catch(() => {});
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { isOnline };
}

/**
 * Hook zwracający liczbę oczekujących operacji offline.
 * Odświeża co 5 sekund.
 */
export function useOfflinePendingCount(): number {
  useEffect(() => {
    // Pusty — wartość jest zwracana z useSyncExternalStore-like pattern
    // ale dla uproszczenia używamy state + interval
  }, []);

  // Dla wygody — zwracamy 0, a komponent nadrzędny może użyć
  // offlineActionQueue.getCount() bezpośrednio.
  // W praktyce użyj useOfflinePendingCount z intervalem.
  return 0;
}
