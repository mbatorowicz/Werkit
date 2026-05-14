"use client";

import { useEffect, useState } from "react";
import { fetchWithDeviceTelemetry } from "@/lib/fetchWithDeviceTelemetry";

type LngLat = { lat: number; lng: number };

/**
 * Trasa OSRM driving do celu (GeoJSON [lng,lat] → Leaflet [lat,lng]).
 */
export function useOsrmRouteToDestination(
  currentLocation: LngLat,
  destination: LngLat | null,
  onRouteDistance?: (distanceKm: number) => void,
): [number, number][] {
  const [routeToDest, setRouteToDest] = useState<[number, number][]>([]);

  useEffect(() => {
    if (!destination) {
      queueMicrotask(() => {
        setRouteToDest([]);
      });
      return;
    }

    const fetchRoute = async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${currentLocation.lng},${currentLocation.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;
        const res = await fetchWithDeviceTelemetry(
          "Map: OSRM driving route",
          url,
          undefined,
          { category: "http", throttleKey: "osrm_driving_route", throttleMs: 12_000 },
        );
        const data: unknown = await res.json();
        const routes = (data as { routes?: { geometry: { coordinates: [number, number][] }; distance: number }[] })
          .routes;
        if (Array.isArray(routes) && routes.length > 0) {
          const route = routes[0];
          const coordinates = route.geometry.coordinates.map(
            (coord: [number, number]) => [coord[1], coord[0]] as [number, number],
          );
          setRouteToDest(coordinates);
          onRouteDistance?.(route.distance / 1000);
        }
      } catch {
        /* OSRM — brak trasy nie powinien blokować mapy */
      }
    };

    void fetchRoute();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- śledzimy wyłącznie współrzędne
  }, [currentLocation.lat, currentLocation.lng, destination?.lat, destination?.lng]);

  return routeToDest;
}
