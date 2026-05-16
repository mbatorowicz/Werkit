import type { RouteLngLat } from "@/lib/map/routeGeometryProvider";

export type RouteWaypoint = RouteLngLat;

export function parseRouteWaypoints(value: unknown): RouteWaypoint[] {
  if (!Array.isArray(value)) return [];
  const out: RouteWaypoint[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const o = item as Record<string, unknown>;
    const lat = typeof o.lat === "number" ? o.lat : Number.parseFloat(String(o.lat));
    const lng = typeof o.lng === "number" ? o.lng : Number.parseFloat(String(o.lng));
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    out.push({ lat, lng });
  }
  return out;
}

export function serializeRouteWaypoints(waypoints: RouteWaypoint[]): RouteWaypoint[] {
  return waypoints.map((w) => ({ lat: w.lat, lng: w.lng }));
}
