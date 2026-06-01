/**
 * Abstrakcja źródła geometrii trasy na mapie (np. OSRM).
 * Obejmuje budowanie URL oraz parsowanie odpowiedzi — logika domenowa OSRM
 * jest skoncentrowana tutaj, a nie w hooku.
 */

export type RouteLngLat = { lat: number; lng: number };

// ---------------------------------------------------------------------------
// Typy odpowiedzi OSRM (turn-by-turn)
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

// ---------------------------------------------------------------------------
// Typy wyjściowe (domenowe, niezależne od OSRM)
// ---------------------------------------------------------------------------

export interface NavigationInstruction {
  /** Human-readable instruction text (from OSRM). */
  text: string;
  /** Maneuver type. */
  type: string;
  /** Modifier: 'left', 'right', 'sharp_left', etc. */
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

export interface ParsedRouteResponse {
  /** All turn-by-turn instructions across all legs. */
  instructions: NavigationInstruction[];
  /** Route geometry as [lat, lng] pairs. */
  geometry: [number, number][];
  /** Total distance in meters. */
  totalDistance: number;
  /** Total duration in seconds. */
  totalDuration: number;
}

// ---------------------------------------------------------------------------
// Provider interface
// ---------------------------------------------------------------------------

export interface RouteGeometryProvider {
  /** Pełny URL żądania GET trasy „driving” (overview=full, geometries=geojson). */
  buildDrivingRouteUrl(from: RouteLngLat, to: RouteLngLat, waypoints?: RouteLngLat[]): string;

  /**
   * Parsuje surową odpowiedź JSON OSRM na domenowe `ParsedRouteResponse`.
   * Rzuca `Error`, gdy odpowiedź nie zawiera tras.
   */
  parseRouteResponse(data: unknown): ParsedRouteResponse;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PROJECT_OSRM_DRIVING_ROUTE_BASE = "https://router.project-osrm.org/route/v1/driving";

function coordSegment(p: RouteLngLat): string {
  return `${p.lng},${p.lat}`;
}

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

// ---------------------------------------------------------------------------
// Default implementation (public OSRM)
// ---------------------------------------------------------------------------

export const projectOsrmPublicRouteGeometryProvider: RouteGeometryProvider = {
  buildDrivingRouteUrl(from, to, waypoints = []) {
    const parts = [coordSegment(from), ...waypoints.map(coordSegment), coordSegment(to)];
    return `${PROJECT_OSRM_DRIVING_ROUTE_BASE}/${parts.join(";")}?overview=full&geometries=geojson`;
  },

  parseRouteResponse(data: unknown): ParsedRouteResponse {
    const body = data as { code?: string; routes?: OsrmRoute[] };
    const routes = body.routes;

    if (!Array.isArray(routes) || routes.length === 0) {
      throw new Error("No route found");
    }

    const route = routes[0];

    // Collect all steps from all legs
    const allSteps: OsrmStep[] = [];
    for (const leg of route.legs) {
      for (const step of leg.steps) {
        allSteps.push(step);
      }
    }

    const instructions = stepsToInstructions(allSteps);
    const geometry = route.geometry.coordinates.map(
      (coord: [number, number]) => [coord[1], coord[0]] as [number, number]
    );

    return {
      instructions,
      geometry,
      totalDistance: route.distance,
      totalDuration: route.duration,
    };
  },
};
