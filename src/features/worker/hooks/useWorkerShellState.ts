"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { workerRouteReducer } from "@/features/worker/gps/workerRouteReducer";
import { fetchWithDeviceTelemetry } from "@/lib/fetchWithDeviceTelemetry";
import { buildWorkerSessionTimeline } from "@/features/worker/lib/workerSessionTimeline";
import { useWorkerSessionSync } from "@/features/worker/hooks/useWorkerSessionSync";
import { useWorkerGPS } from "@/features/worker/hooks/useWorkerGPS";
import type {
  AppSettings,
  Coord,
  InitialWorkerData,
  Session,
  TimelineItem,
  UserData,
  WorkOrder,
} from "@/types/worker";
import { narrowAppSettings, narrowUserData } from "@/features/worker/lib/narrowWorkerClientPayload";
import { loadWorkerSessionAndPath } from "@/features/worker/hooks/workerShellSessionLoad";

export function useWorkerShellState(initialData: InitialWorkerData | null) {
  const [timelineEvents, setTimelineEvents] = useState<TimelineItem[]>(() =>
    initialData ? buildWorkerSessionTimeline(initialData.events, initialData.notes) : []
  );
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const [session, setSession] = useState<Session | null>(initialData?.session ?? null);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>(initialData?.workOrders ?? []);
  const [isLoading, setIsLoading] = useState(!initialData);

  const [settings, setSettings] = useState<AppSettings | null>(() =>
    initialData?.settings ? narrowAppSettings(initialData.settings) : null
  );
  const [currentUser, setCurrentUser] = useState<UserData | null>(() =>
    initialData?.user ? narrowUserData(initialData.user) : null
  );

  const [location, setLocation] = useState<Coord | null>(null);
  const [route, dispatchRoute] = useReducer(workerRouteReducer, { path: [], km: 0 });
  const pathTraveled = route.path;
  const traveledKm = route.km;
  const [destination, setDestination] = useState<Coord | null>(null);
  const destinationRef = useRef<Coord | null>(null);
  useEffect(() => {
    destinationRef.current = destination;
  }, [destination]);
  const [routeWaypoints, setRouteWaypoints] = useState<Coord[]>([]);
  const [customerLocationId, setCustomerLocationId] = useState<number | null>(null);
  const [distanceToDestKm, setDistanceToDestKm] = useState<number | null>(null);

  const [gpsStatus, setGpsStatus] = useState<"waiting" | "active" | "error">("waiting");

  const fetchSessionAndPath = useCallback(async (showLoader = true, fetchGpsPath = true) => {
    if (showLoader) setIsLoading(true);
    await loadWorkerSessionAndPath(fetchGpsPath, {
      destinationRef,
      dispatchRoute,
      setWorkOrders,
      setSession,
      setTimelineEvents,
      setSettings,
      setCurrentUser,
      setDestination,
      setRouteWaypoints,
      setCustomerLocationId,
      setDistanceToDestKm,
    });
    if (showLoader) setIsLoading(false);
  }, []);

  useWorkerSessionSync(initialData, fetchSessionAndPath);

  useWorkerGPS(session, setLocation, dispatchRoute, setGpsStatus);

  const persistRouteWaypoints = useCallback(
    async (next: Coord[]) => {
      setRouteWaypoints(next);
      if (!customerLocationId || !currentUser?.canEditRoute) return;
      try {
        await fetchWithDeviceTelemetry(
          `Worker: save route waypoints ${customerLocationId}`,
          `/api/worker/customer-locations/${customerLocationId}/route`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ waypoints: next }),
          },
          { category: "orders" }
        );
      } catch {
        /* zapis trasy opcjonalny */
      }
    },
    [customerLocationId, currentUser?.canEditRoute]
  );

  return {
    timelineEvents,
    isTimelineOpen,
    setIsTimelineOpen,
    selectedEventId,
    setSelectedEventId,
    session,
    workOrders,
    isLoading,
    setIsLoading,
    settings,
    currentUser,
    location,
    pathTraveled,
    destination,
    routeWaypoints,
    setRouteWaypoints,
    customerLocationId,
    persistRouteWaypoints,
    distanceToDestKm,
    traveledKm,
    gpsStatus,
    fetchSessionAndPath,
    setDistanceToDestKm,
  };
}
