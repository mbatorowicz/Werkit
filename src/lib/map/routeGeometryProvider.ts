/**
 * Abstrakcja źródła geometrii trasy na mapie (np. OSRM).
 */

export type RouteLngLat = { lat: number; lng: number };

export interface RouteGeometryProvider {
  /** Pełny URL żądania GET trasy „driving” (overview=full, geometries=geojson). */
  buildDrivingRouteUrl(from: RouteLngLat, to: RouteLngLat, waypoints?: RouteLngLat[]): string;
}

const PROJECT_OSRM_DRIVING_ROUTE_BASE =
  "https://router.project-osrm.org/route/v1/driving";

function coordSegment(p: RouteLngLat): string {
  return `${p.lng},${p.lat}`;
}

export const projectOsrmPublicRouteGeometryProvider: RouteGeometryProvider = {
  buildDrivingRouteUrl(from, to, waypoints = []) {
    const parts = [coordSegment(from), ...waypoints.map(coordSegment), coordSegment(to)];
    return `${PROJECT_OSRM_DRIVING_ROUTE_BASE}/${parts.join(";")}?overview=full&geometries=geojson`;
  },
};
