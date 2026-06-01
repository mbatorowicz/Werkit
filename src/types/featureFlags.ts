// ============================================================
// Werkit — Feature flags (przełączniki GPS/Map na organizację)
// ============================================================

/**
 * Flagi funkcyjne dla organizacji.
 * Przechowywane w company_settings jako osobne kolumny boolean.
 * Domyślnie wszystkie włączone (true) — zachowanie wstecznie zgodne.
 */
export type FeatureFlags = {
  /** Globalny przełącznik GPS — wyłączenie blokuje cały moduł śledzenia. */
  gpsTrackingEnabled: boolean;
  /** Widok mapy w panelu admina i workera. */
  mapViewEnabled: boolean;
  /** Geofencing — powiadomienia o wjeździe/wyjeździe ze stref. */
  geofencingEnabled: boolean;
  /** Planowanie trasy (OSRM / kolejność odwiedzin). */
  routePlanningEnabled: boolean;
  /** Nawigacja krok po kroku (turn-by-turn). */
  navigationEnabled: boolean;
  /** Moduł DUR (części zamienne, magazyn) — domyślnie wyłączony. */
  durEnabled: boolean;
};

/** Domyślne wartości flag (wszystkie włączone). */
export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  gpsTrackingEnabled: true,
  mapViewEnabled: true,
  geofencingEnabled: true,
  routePlanningEnabled: true,
  navigationEnabled: true,
  durEnabled: false,
};

/** Klucze flag do iteracji w UI. */
export const FEATURE_FLAG_KEYS: (keyof FeatureFlags)[] = [
  "gpsTrackingEnabled",
  "mapViewEnabled",
  "geofencingEnabled",
  "routePlanningEnabled",
  "navigationEnabled",
  "durEnabled",
];

/** Etykiety i18n dla flag. */
export const FEATURE_FLAG_LABELS: Record<keyof FeatureFlags, string> = {
  gpsTrackingEnabled: "platform.settings.gpsTrackingEnabled",
  mapViewEnabled: "platform.settings.mapViewEnabled",
  geofencingEnabled: "platform.settings.geofencingEnabled",
  routePlanningEnabled: "platform.settings.routePlanningEnabled",
  navigationEnabled: "platform.settings.navigationEnabled",
  durEnabled: "platform.settings.durEnabled",
};
