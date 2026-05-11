import type { Coord } from '@/types/worker';

/** Jednorazowy odczyt pozycji (np. start/koniec zlecenia). Na brak zgody lub timeout → null. */
export function getCurrentPositionOnce(timeoutMs = 12000): Promise<Coord | null> {
  if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve(null), timeoutMs);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        window.clearTimeout(timer);
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          heading: pos.coords.heading ?? undefined,
        });
      },
      () => {
        window.clearTimeout(timer);
        resolve(null);
      },
      { enableHighAccuracy: true, maximumAge: 45000, timeout: timeoutMs },
    );
  });
}
