// ============================================================
// Werkit — Feature flags (przełączniki GPS/Map na organizację)
// ============================================================

/**
 * Flagi funkcyjne dla organizacji.
 * Przechowywane w company_settings jako osobne kolumny boolean.
 * Domyślnie wszystkie GPS włączone (true) — zachowanie wstecznie zgodne.
 * Flagi GPS są niezależne: wyłączenie geofence / nawigacji nie wyłącza śledzenia.
 */
export type FeatureFlags = {
  /** Śledzenie GPS sesji — zapis `gps_logs`. */
  gpsTrackingEnabled: boolean;
  /** Widok mapy w panelu admina i workera. */
  mapViewEnabled: boolean;
  /** Geofencing — potwierdzenie „Dojechał” poza promieniem. */
  geofencingEnabled: boolean;
  /** Planowanie trasy (OSRM / kolejność odwiedzin). */
  routePlanningEnabled: boolean;
  /** Nawigacja krok po kroku (tryb kamery / turn-by-turn). */
  navigationEnabled: boolean;
  /** Moduł DUR (części zamienne, magazyn) — domyślnie wyłączony. */
  durEnabled: boolean;
};

/** Domyślne wartości flag (GPS włączony, DUR wyłączony). */
export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  gpsTrackingEnabled: true,
  mapViewEnabled: true,
  geofencingEnabled: true,
  routePlanningEnabled: true,
  navigationEnabled: true,
  durEnabled: false,
};

/** Klucze flag GPS/map — grupa w panelu platformy (osobne przełączniki). */
export const GPS_FEATURE_FLAG_KEYS: (keyof FeatureFlags)[] = [
  "gpsTrackingEnabled",
  "mapViewEnabled",
  "geofencingEnabled",
  "routePlanningEnabled",
  "navigationEnabled",
];

/** Klucze modułu DUR — jeden przełącznik w panelu platformy. */
export const DUR_FEATURE_FLAG_KEYS: (keyof FeatureFlags)[] = ["durEnabled"];

/**
 * Śledzenie GPS (zapis pozycji). Nie AND-uje mapy / geofence / trasy / nawigacji.
 */
export function isGpsModuleEnabled(flags: FeatureFlags): boolean {
  return flags.gpsTrackingEnabled;
}

/**
 * UI GPS w panelu admina: śledzenie albo mapa.
 * Geofence / trasa / nawigacja off nie gaszą tej flagi.
 */
export function isAdminGpsEnabled(flags: FeatureFlags): boolean {
  return flags.gpsTrackingEnabled || flags.mapViewEnabled;
}

/** Uprawnienie `canEditRoute` — wymaga mapy i planowania trasy. */
export function canAssignWorkerRouteEdit(flags: FeatureFlags): boolean {
  return flags.mapViewEnabled && flags.routePlanningEnabled;
}

export type AdminGpsCapabilityFlags = Pick<
  FeatureFlags,
  | "gpsTrackingEnabled"
  | "mapViewEnabled"
  | "geofencingEnabled"
  | "routePlanningEnabled"
  | "navigationEnabled"
>;

export const DEFAULT_ADMIN_GPS_FLAGS: AdminGpsCapabilityFlags = {
  gpsTrackingEnabled: true,
  mapViewEnabled: true,
  geofencingEnabled: true,
  routePlanningEnabled: true,
  navigationEnabled: true,
};

export function toAdminGpsFlags(flags: FeatureFlags): AdminGpsCapabilityFlags {
  return {
    gpsTrackingEnabled: flags.gpsTrackingEnabled,
    mapViewEnabled: flags.mapViewEnabled,
    geofencingEnabled: flags.geofencingEnabled,
    routePlanningEnabled: flags.routePlanningEnabled,
    navigationEnabled: flags.navigationEnabled,
  };
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
