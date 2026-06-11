"use client";

import { useEffect, useRef, useState } from "react";
import { fetchWithDeviceTelemetry } from "@/lib/fetchWithDeviceTelemetry";
import { useDictionary } from "@/components/LocaleProvider";
import {
  projectOsrmPublicRouteGeometryProvider,
  type RouteGeometryProvider,
  type RouteLngLat,
  type NavigationInstruction,
} from "@/lib/map/routeGeometryProvider";

// Re-export dla komponentów importujących z tego modułu (NavigationBottomSheet, NavigationInstructionBar)
export type { NavigationInstruction } from "@/lib/map/routeGeometryProvider";

// ---------------------------------------------------------------------------
// Types for navigation state (domenowe, niezależne od OSRM)
// ---------------------------------------------------------------------------

export interface NavigationState {
  /** All instructions for the entire route. */
  instructions: NavigationInstruction[];
  /** The current active instruction index (the one the user should follow next). */
  currentInstructionIndex: number;
  /** Remaining distance to the current instruction in meters. */
  remainingToNextInstruction: number;
  /** Total remaining distance to destination in meters. */
  remainingDistance: number;
  /** Total remaining duration to destination in seconds. */
  remainingDuration: number;
  /** The full route geometry as [lat, lng] pairs. */
  routeGeometry: [number, number][];
  /** Whether navigation data is being loaded. */
  loading: boolean;
  /** Error message if route fetch failed. */
  error: string | null;
}

/** Find which instruction the user is currently heading towards based on position. */
function findCurrentInstructionIndex(
  instructions: NavigationInstruction[],
  currentLocation: RouteLngLat,
  routeGeometry: [number, number][]
): number {
  if (instructions.length === 0) return 0;

  // Find the closest point on route geometry to current location
  let closestIdx = 0;
  let minDist = Infinity;

  for (let i = 0; i < routeGeometry.length; i++) {
    const [lat, lng] = routeGeometry[i];
    const d = haversineDistance(currentLocation.lat, currentLocation.lng, lat, lng);
    if (d < minDist) {
      minDist = d;
      closestIdx = i;
    }
  }

  // Map geometry index to instruction index
  // Each instruction's location is a point on the route
  let instructionIdx = 0;
  for (let i = 0; i < instructions.length; i++) {
    const inst = instructions[i];
    // Find the geometry point closest to this instruction
    let instGeoIdx = -1;
    let instMinDist = Infinity;
    for (let j = 0; j < routeGeometry.length; j++) {
      const [lat, lng] = routeGeometry[j];
      const d = haversineDistance(inst.location.lat, inst.location.lng, lat, lng);
      if (d < instMinDist) {
        instMinDist = d;
        instGeoIdx = j;
      }
    }
    if (instGeoIdx >= 0 && instGeoIdx <= closestIdx) {
      instructionIdx = i;
    }
  }

  // Don't go past the last instruction (arrive)
  return Math.min(instructionIdx, instructions.length - 1);
}

/** Haversine distance in meters between two coordinates. */
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** Calculate remaining distance along route geometry from closest point to end. */
function calculateRemainingDistance(
  currentLocation: RouteLngLat,
  routeGeometry: [number, number][]
): number {
  if (routeGeometry.length < 2) return 0;

  // Find closest segment
  let minDist = Infinity;
  let closestSegmentStart = 0;

  for (let i = 0; i < routeGeometry.length - 1; i++) {
    const [lat1, lng1] = routeGeometry[i];
    const [lat2, lng2] = routeGeometry[i + 1];
    const d = pointToSegmentDistance(
      currentLocation.lat,
      currentLocation.lng,
      lat1,
      lng1,
      lat2,
      lng2
    );
    if (d < minDist) {
      minDist = d;
      closestSegmentStart = i;
    }
  }

  // Sum distance from closest segment start to end
  let remaining = 0;
  for (let i = closestSegmentStart; i < routeGeometry.length - 1; i++) {
    const [lat1, lng1] = routeGeometry[i];
    const [lat2, lng2] = routeGeometry[i + 1];
    remaining += haversineDistance(lat1, lng1, lat2, lng2);
  }

  return remaining;
}

/** Distance from point to line segment. */
function pointToSegmentDistance(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) return haversineDistance(px, py, ax, ay);

  let t = ((px - ax) * dx + (py - ay) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));

  const projX = ax + t * dx;
  const projY = ay + t * dy;
  return haversineDistance(px, py, projX, projY);
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

interface UseOsrmNavigationOptions {
  /** How often (ms) to recalculate the current instruction based on GPS position. */
  recalculateIntervalMs?: number;
  /** Custom route geometry provider. */
  routeGeometryProvider?: RouteGeometryProvider;
}

/**
 * Hook that fetches OSRM driving route with turn-by-turn instructions
 * and tracks the user's progress along the route.
 *
 * Returns navigation instructions, current step, remaining distance/duration.
 */
export function useOsrmNavigation(
  currentLocation: RouteLngLat,
  destination: RouteLngLat | null,
  waypoints: RouteLngLat[] = [],
  options: UseOsrmNavigationOptions = {}
): NavigationState {
  const dict = useDictionary();
  const {
    recalculateIntervalMs = 3000,
    routeGeometryProvider = projectOsrmPublicRouteGeometryProvider,
  } = options;

  const [instructions, setInstructions] = useState<NavigationInstruction[]>([]);
  const [routeGeometry, setRouteGeometry] = useState<[number, number][]>([]);
  const [currentInstructionIndex, setCurrentInstructionIndex] = useState(0);
  const [remainingDistance, setRemainingDistance] = useState(0);
  const [remainingDuration, setRemainingDuration] = useState(0);
  const [remainingToNextInstruction, setRemainingToNextInstruction] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const instructionsRef = useRef<NavigationInstruction[]>([]);
  const routeGeometryRef = useRef<[number, number][]>([]);
  const totalDurationRef = useRef(0);

  const wpKey = waypoints.map((w) => `${w.lat},${w.lng}`).join("|");

  // Fetch route with steps
  useEffect(() => {
    if (!destination) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset stanu przy zmianie destynacji, konieczne przed fetch
      setInstructions([]);
      setRouteGeometry([]);
      setCurrentInstructionIndex(0);
      setRemainingDistance(0);
      setRemainingDuration(0);
      setRemainingToNextInstruction(0);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const fetchRoute = async () => {
      try {
        // Use steps=true to get turn-by-turn instructions
        const baseUrl = routeGeometryProvider.buildDrivingRouteUrl(
          currentLocation,
          destination,
          waypoints
        );
        // Append steps=true for turn-by-turn instructions
        const separator = baseUrl.includes("?") ? "&" : "?";
        const url = `${baseUrl}${separator}steps=true&annotations=true`;

        const res = await fetchWithDeviceTelemetry("Map: OSRM navigation route", url, undefined, {
          category: "http",
          throttleKey: "osrm_navigation_route",
          throttleMs: 15_000,
        });
        const data: unknown = await res.json();

        if (cancelled) return;

        // Delegate parsing to the provider — OSRM-specific logic lives there
        const parsed = routeGeometryProvider.parseRouteResponse(data);

        instructionsRef.current = parsed.instructions;
        routeGeometryRef.current = parsed.geometry;
        totalDurationRef.current = parsed.totalDuration;

        setInstructions(parsed.instructions);
        setRouteGeometry(parsed.geometry);
        setRemainingDistance(parsed.totalDistance);
        setRemainingDuration(parsed.totalDuration);

        // Find initial instruction
        const idx = findCurrentInstructionIndex(
          parsed.instructions,
          currentLocation,
          parsed.geometry
        );
        setCurrentInstructionIndex(idx);

        // Calculate remaining to next instruction
        if (idx < parsed.instructions.length) {
          const distToInst = haversineDistance(
            currentLocation.lat,
            currentLocation.lng,
            parsed.instructions[idx].location.lat,
            parsed.instructions[idx].location.lng
          );
          setRemainingToNextInstruction(distToInst);
        }

        setLoading(false);
      } catch {
        if (!cancelled) {
          setError(dict.common.errors.routeFetch);
          setLoading(false);
        }
      }
    };

    void fetchRoute();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLocation.lat, currentLocation.lng, destination?.lat, destination?.lng, wpKey]);

  // Periodically recalculate position along route
  useEffect(() => {
    if (!destination || instructions.length === 0 || routeGeometry.length === 0) return;

    const interval = window.setInterval(() => {
      const idx = findCurrentInstructionIndex(
        instructionsRef.current,
        currentLocation,
        routeGeometryRef.current
      );
      setCurrentInstructionIndex(idx);

      // Remaining distance to destination
      const remDist = calculateRemainingDistance(currentLocation, routeGeometryRef.current);
      setRemainingDistance(remDist);

      // Estimate remaining duration proportionally
      if (totalDurationRef.current > 0 && instructionsRef.current.length > 0) {
        const totalDist =
          remDist +
          calculateRemainingDistance(
            {
              lat: routeGeometryRef.current[0]?.[0] ?? currentLocation.lat,
              lng: routeGeometryRef.current[0]?.[1] ?? currentLocation.lng,
            },
            routeGeometryRef.current
          );
        const traveledRatio = totalDist > 0 ? remDist / totalDist : 1;
        setRemainingDuration(totalDurationRef.current * traveledRatio);
      }

      // Remaining to next instruction
      if (idx < instructionsRef.current.length) {
        const distToInst = haversineDistance(
          currentLocation.lat,
          currentLocation.lng,
          instructionsRef.current[idx].location.lat,
          instructionsRef.current[idx].location.lng
        );
        setRemainingToNextInstruction(distToInst);
      }
    }, recalculateIntervalMs);

    return () => window.clearInterval(interval);
  }, [
    destination,
    instructions.length,
    routeGeometry.length,
    currentLocation,
    recalculateIntervalMs,
  ]);

  return {
    instructions,
    currentInstructionIndex,
    remainingToNextInstruction,
    remainingDistance,
    remainingDuration,
    routeGeometry,
    loading,
    error,
  };
}
