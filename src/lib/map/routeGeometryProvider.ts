/**
 * Abstrakcja źródła geometrii trasy na mapie (np. OSRM).
 * Hook `useOsrmRouteToDestination` nadal wykonuje fetch (telemetria + throttle) i parsuje odpowiedź OSRM.
 */

export type RouteLngLat = { lat: number; lng: number };

export interface RouteGeometryProvider {
  /** Pełny URL żądania GET trasy „driving” w formacie zwracającym GeoJSON (overview=full). */
  buildDrivingRouteUrl(from: RouteLngLat, to: RouteLngLat): string;
}

const PROJECT_OSRM_DRIVING_ROUTE_BASE =
  "https://router.project-osrm.org/route/v1/driving";

export const projectOsrmPublicRouteGeometryProvider: RouteGeometryProvider = {
  buildDrivingRouteUrl(from, to) {
    return `${PROJECT_OSRM_DRIVING_ROUTE_BASE}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
  },
};
