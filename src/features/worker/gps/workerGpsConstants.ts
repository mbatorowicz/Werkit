/** Odrzucamy punkty o gorszej dokładności (szpilki) — zgodnie z dotychczasową logiką worker. */
export const WORKER_GPS_MAX_ACCURACY_METERS = 40;

/** Natywny watcher Capacitor — minimalny dystans między próbkami (m). */
export const WORKER_GPS_NATIVE_DISTANCE_FILTER_METERS = 10;

/** Okresowy flush kolejki GPS do API (ms). */
export const WORKER_GPS_QUEUE_FLUSH_INTERVAL_MS = 30_000;

export const WORKER_BG_GEO_NOTIFICATION = {
  backgroundMessage: "Aplikacja śledzi trasę pracownika w tle.",
  backgroundTitle: "Werkit - Rejestrowanie trasy",
} as const;

/** `navigator.geolocation.watchPosition` — web / PWA. */
export const WORKER_WEB_GEO_WATCH_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 10_000,
  timeout: 15_000,
};
