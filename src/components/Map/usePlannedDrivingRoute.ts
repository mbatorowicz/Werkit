"use client";

import { useEffect, useState } from "react";
import { fetchWithDeviceTelemetry } from "@/lib/fetchWithDeviceTelemetry";
import {
  projectOsrmPublicRouteGeometryProvider,
  type RouteGeometryProvider,
  type RouteLngLat,
} from "@/lib/map/routeGeometryProvider";

/**
 * Trasa OSRM przez opcjonalne punkty pośrednie (GeoJSON [lng,lat] → Leaflet [lat,lng]).
 */
export function usePlannedDrivingRoute(
  from: RouteLngLat,
  to: RouteLngLat | null,
  waypoints: RouteLngLat[],
  onRouteDistance?: (distanceKm: number) => void,
  routeGeometryProvider: RouteGeometryProvider = projectOsrmPublicRouteGeometryProvider,
): [number, number][] {
  const [routeLine, setRouteLine] = useState<[number, number][]>([]);

  const wpKey = waypoints.map((w) => `${w.lat},${w.lng}`).join("|");

  useEffect(() => {
    if (!to) {
      queueMicrotask(() => setRouteLine([]));
      return;
    }

    const fetchRoute = async () => {
      try {
        const url = routeGeometryProvider.buildDrivingRouteUrl(from, to, waypoints);
        const res = await fetchWithDeviceTelemetry(
          "Map: OSRM planned route",
          url,
          undefined,
          { category: "http", throttleKey: "osrm_driving_route", throttleMs: 8_000 },
        );
        const data: unknown = await res.json();
        const routes = (data as { routes?: { geometry: { coordinates: [number, number][] }; distance: number }[] })
          .routes;
        if (Array.isArray(routes) && routes.length > 0) {
          const route = routes[0];
          const coordinates = route.geometry.coordinates.map(
            (coord: [number, number]) => [coord[1], coord[0]] as [number, number],
          );
          setRouteLine(coordinates);
          onRouteDistance?.(route.distance / 1000);
        }
      } catch {
        /* OSRM — brak trasy nie powinien blokować mapy */
      }
    };

    void fetchRoute();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- współrzędne + waypoints
  }, [from.lat, from.lng, to?.lat, to?.lng, wpKey]);

  return routeLine;
}
