"use client";

import { useEffect, useRef, useState } from "react";
import { fetchWithDeviceTelemetry } from "@/lib/fetchWithDeviceTelemetry";
import {
  projectOsrmPublicRouteGeometryProvider,
  type RouteGeometryProvider,
  type RouteLngLat,
} from "@/lib/map/routeGeometryProvider";

// ---------------------------------------------------------------------------
// Types for OSRM turn-by-turn navigation
// ---------------------------------------------------------------------------

export interface OsrmStepManeuver {
  type: string;
  modifier?: string;
  location: [number, number]; // [lng, lat]
  bearing_before?: number;
  bearing_after?: number;
}

export interface OsrmStep {
  name: string;
  ref?: string;
  distance: number; // meters
  duration: number; // seconds
  maneuver: OsrmStepManeuver;
  instruction: string;
  driving_side?: string;
}

export interface OsrmLeg {
  steps: OsrmStep[];
  distance: number;
  duration: number;
  summary: string;
}

export interface OsrmRoute {
  legs: OsrmLeg[];
  geometry: { coordinates: [number, number][] };
  distance: number; // total meters
  duration: number; // total seconds
}

export interface NavigationInstruction {
  /** Human-readable instruction text (from OSRM). */
  text: string;
  /** Maneuver type: 'turn', 'continue', 'straight', 'roundabout', 'arrive', 'depart', 'fork', 'merge', 'ramp', 'rotary', 'exit_roundabout', 'end_of_road', 'use_lane' */
  type: string;
  /** Modifier: 'left', 'right', 'sharp_left', 'sharp_right', 'slight_left', 'slight_right', 'straight', 'uturn' */
  modifier?: string;
  /** Distance to this instruction in meters. */
  distanceMeters: number;
  /** Duration to this instruction in seconds. */
  durationSeconds: number;
  /** Street name. */
  streetName: string;
  /** The coordinate [lat, lng] where this maneuver happens. */
  location: { lat: number; lng: number };
  /** Index of this instruction in the full list. */
  index: number;
}

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert OSRM steps into our NavigationInstruction format. */
function stepsToInstructions(steps: OsrmStep[]): NavigationInstruction[] {
  return steps.map((step, idx) => ({
    text: step.instruction,
    type: step.maneuver.type,
    modifier: step.maneuver.modifier,
    distanceMeters: step.distance,
    durationSeconds: step.duration,
    streetName: step.name || step.ref || "",
    location: { lat: step.maneuver.location[1], lng: step.maneuver.location[0] },
    index: idx,
  }));
}

/** Find which instruction the user is currently heading towards based on position. */
function findCurrentInstructionIndex(
  instructions: NavigationInstruction[],
  currentLocation: RouteLngLat,
  routeGeometry: [number, number][],
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
  routeGeometry: [number, number][],
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
      lng2,
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
  by: number,
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
  options: UseOsrmNavigationOptions = {},
): NavigationState {
  const { recalculateIntervalMs = 3000, routeGeometryProvider = projectOsrmPublicRouteGeometryProvider } = options;

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
          waypoints,
        );
        // Append steps=true for turn-by-turn instructions
        const separator = baseUrl.includes("?") ? "&" : "?";
        const url = `${baseUrl}${separator}steps=true&annotations=true`;

        const res = await fetchWithDeviceTelemetry(
          "Map: OSRM navigation route",
          url,
          undefined,
          { category: "http", throttleKey: "osrm_navigation_route", throttleMs: 15_000 },
        );
        const data: unknown = await res.json();
        const routes = (data as { code?: string; routes?: OsrmRoute[] }).routes;

        if (cancelled) return;

        if (!Array.isArray(routes) || routes.length === 0) {
          setError("No route found");
          setLoading(false);
          return;
        }

        const route = routes[0];

        // Collect all steps from all legs
        const allSteps: OsrmStep[] = [];
        for (const leg of route.legs) {
          for (const step of leg.steps) {
            allSteps.push(step);
          }
        }

        const navInstructions = stepsToInstructions(allSteps);
        const geometry = route.geometry.coordinates.map(
          (coord: [number, number]) => [coord[1], coord[0]] as [number, number],
        );

        instructionsRef.current = navInstructions;
        routeGeometryRef.current = geometry;
        totalDurationRef.current = route.duration;

        setInstructions(navInstructions);
        setRouteGeometry(geometry);
        setRemainingDistance(route.distance);
        setRemainingDuration(route.duration);

        // Find initial instruction
        const idx = findCurrentInstructionIndex(navInstructions, currentLocation, geometry);
        setCurrentInstructionIndex(idx);

        // Calculate remaining to next instruction
        if (idx < navInstructions.length) {
          const distToInst = haversineDistance(
            currentLocation.lat,
            currentLocation.lng,
            navInstructions[idx].location.lat,
            navInstructions[idx].location.lng,
          );
          setRemainingToNextInstruction(distToInst);
        }

        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to fetch route");
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
        routeGeometryRef.current,
      );
      setCurrentInstructionIndex(idx);

      // Remaining distance to destination
      const remDist = calculateRemainingDistance(currentLocation, routeGeometryRef.current);
      setRemainingDistance(remDist);

      // Estimate remaining duration proportionally
      if (totalDurationRef.current > 0 && instructionsRef.current.length > 0) {
        const totalDist = remDist + calculateRemainingDistance(
          { lat: routeGeometryRef.current[0]?.[0] ?? currentLocation.lat, lng: routeGeometryRef.current[0]?.[1] ?? currentLocation.lng },
          routeGeometryRef.current,
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
          instructionsRef.current[idx].location.lng,
        );
        setRemainingToNextInstruction(distToInst);
      }
    }, recalculateIntervalMs);

    return () => window.clearInterval(interval);
  }, [destination, instructions.length, routeGeometry.length, currentLocation, recalculateIntervalMs]);

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
