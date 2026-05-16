/** Wspólne kafelki CARTO dla wszystkich map Leaflet w Werkit. */

export const MAP_TILE_SUBDOMAINS = 'abcd';
export const MAP_TILE_MAX_ZOOM = 20;

export const MAP_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

export type MapBasemapLayer = {
  url: string;
  /** Pusta — tylko pierwsza warstwa ma attribution. */
  attribution?: string;
  zIndex?: number;
};

export type MapBasemapPreset = {
  id: 'light' | 'dark';
  layers: MapBasemapLayer[];
};

/** Jasna: Voyager — czytelne drogi i granice. */
const LIGHT_BASE: MapBasemapLayer = {
  url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
  attribution: MAP_ATTRIBUTION,
};

/**
 * Ciemna: tło Dark Matter + jasne napisy (`light_only_labels` na `dark_nolabels`).
 * Samo `dark_only_labels` bywa prawie niewidoczne; `rastertiles/dark_all` też działa, ale słabszy kontrast dróg.
 */
const DARK_BASE: MapBasemapLayer = {
  url: 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png',
  attribution: MAP_ATTRIBUTION,
  zIndex: 0,
};

const DARK_LABELS: MapBasemapLayer = {
  url: 'https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png',
  attribution: '',
  zIndex: 650,
};

export function getMapBasemapPreset(isDark: boolean): MapBasemapPreset {
  if (isDark) {
    return { id: 'dark', layers: [DARK_BASE, DARK_LABELS] };
  }
  return { id: 'light', layers: [LIGHT_BASE] };
}
