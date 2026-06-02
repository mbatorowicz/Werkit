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

/** Klucze flag GPS/map — grupa w panelu platformy. */
export const GPS_FEATURE_FLAG_KEYS: (keyof FeatureFlags)[] = [
  "gpsTrackingEnabled",
  "mapViewEnabled",
  "geofencingEnabled",
  "routePlanningEnabled",
  "navigationEnabled",
];

/** Klucze modułu DUR — jeden przełącznik w panelu platformy. */
export const DUR_FEATURE_FLAG_KEYS: (keyof FeatureFlags)[] = ["durEnabled"];

/** Czy moduł GPS i mapa jest włączony (wszystkie flagi GPS muszą być true). */
export function isGpsModuleEnabled(flags: FeatureFlags): boolean {
  return GPS_FEATURE_FLAG_KEYS.every((key) => flags[key]);
}

/** PATCH ustawiający wszystkie flagi modułu GPS/map na tę samą wartość. */
export function gpsModuleFlagsPatch(enabled: boolean): Partial<FeatureFlags> {
  const patch: Partial<FeatureFlags> = {};
  for (const key of GPS_FEATURE_FLAG_KEYS) {
    patch[key] = enabled;
  }
  return patch;
}

/** Klucze flag do iteracji w UI (legacy — pełna lista). */
export const FEATURE_FLAG_KEYS: (keyof FeatureFlags)[] = [
  ...GPS_FEATURE_FLAG_KEYS,
  ...DUR_FEATURE_FLAG_KEYS,
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
