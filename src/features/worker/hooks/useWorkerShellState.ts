"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { foldMicroJumpsInPath } from "@/lib/gps";
import { workerRouteReducer } from "@/features/worker/gps/workerRouteReducer";
import { fetchWithDeviceTelemetry } from "@/lib/fetchWithDeviceTelemetry";
import { sendRemoteLog } from "@/lib/remoteLogger";
import { buildWorkerSessionTimeline } from "@/features/worker/lib/workerSessionTimeline";
import { useWorkerSessionSync } from "@/features/worker/hooks/useWorkerSessionSync";
import { useWorkerGPS } from "@/features/worker/hooks/useWorkerGPS";
import type { AppSettings, Coord, InitialWorkerData, Session, TimelineItem, UserData, WorkOrder } from "@/types/worker";
import { parseJsonArray } from "@/lib/parseJsonArray";
import { parseJsonUnknown } from "@/lib/parseApiJson";
import { narrowWorkOrders } from "@/lib/narrowApiListRows";
import {
  narrowAppSettings,
  narrowGpsPathLogs,
  narrowNominatimHits,
  narrowSession,
  narrowUserData,
} from "@/features/worker/lib/narrowWorkerClientPayload";

export function useWorkerShellState(initialData: InitialWorkerData | null) {
  const [timelineEvents, setTimelineEvents] = useState<TimelineItem[]>(() =>
    initialData ? buildWorkerSessionTimeline(initialData.events, initialData.notes) : [],
  );
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const [session, setSession] = useState<Session | null>(initialData?.session ?? null);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>(initialData?.workOrders ?? []);
  const [isLoading, setIsLoading] = useState(!initialData);

  const [settings, setSettings] = useState<AppSettings | null>(initialData?.settings ?? null);
  const [currentUser, setCurrentUser] = useState<UserData | null>(initialData?.user ?? null);

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
    try {
      const [resSess, resOrders] = await Promise.all([
        fetchWithDeviceTelemetry("Worker: session GET", "/api/worker/session", { cache: "no-store" }, {
          category: "session",
        }),
        fetchWithDeviceTelemetry("Worker: work-orders GET", "/api/worker/work-orders", { cache: "no-store" }, {
          category: "orders",
        }),
      ]);

      if (!resSess.ok) throw new Error(`Session fetch failed: ${resSess.status}`);
      if (!resOrders.ok) throw new Error(`Orders fetch failed: ${resOrders.status}`);

      const sessRaw = await parseJsonUnknown(resSess);
      const ordersRows = await parseJsonArray(resOrders);
      setWorkOrders(narrowWorkOrders(ordersRows));

      const sessData: Record<string, unknown> =
        sessRaw !== null && typeof sessRaw === "object" && !Array.isArray(sessRaw)
          ? (sessRaw as Record<string, unknown>)
          : {};

      const sessionRowEarly = narrowSession(sessData.session);
      const stationary = Boolean(sessionRowEarly?.categoryIsStationary);
      if (stationary) {
        dispatchRoute({ type: "reset", path: [] });
        setDestination(null);
        setDistanceToDestKm(null);
      }

      if (fetchGpsPath && sessionRowEarly && !stationary) {
        try {
          const resPath = await fetchWithDeviceTelemetry("Worker: gps path GET", "/api/worker/gps", {
            cache: "no-store",
          }, { category: "gps" });
          const pathBody = await parseJsonUnknown(resPath);
          const logs = narrowGpsPathLogs(pathBody);
          if (logs.length > 0) {
            const folded = foldMicroJumpsInPath(logs);
            dispatchRoute({ type: "reset", path: folded });
          }
        } catch {
          /* ścieżka GPS opcjonalna */
        }
      }

      if ("settings" in sessData) {
        const settingsParsed = narrowAppSettings(sessData.settings);
        if (settingsParsed !== null) setSettings(settingsParsed);
      }
      if ("user" in sessData) {
        const userParsed = narrowUserData(sessData.user);
        if (userParsed !== null) setCurrentUser(userParsed);
      }

      if (sessionRowEarly) {
        setSession(sessionRowEarly);
        setTimelineEvents(buildWorkerSessionTimeline(sessData.events, sessData.notes));

        const sessStationary = Boolean(sessionRowEarly.categoryIsStationary);
        if (!sessStationary) {
          const s = sessionRowEarly;
          setRouteWaypoints(Array.isArray(s.routeWaypoints) ? s.routeWaypoints : []);
          setCustomerLocationId(typeof s.customerLocationId === "number" ? s.customerLocationId : null);
          if (s.customerLat && s.customerLng) {
            setDestination({ lat: parseFloat(s.customerLat), lng: parseFloat(s.customerLng) });
          } else if (s.customerAddress && !destinationRef.current) {
            try {
              const geo = await fetchWithDeviceTelemetry(
                "Worker: Nominatim geocode",
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(s.customerAddress)}`,
                undefined,
                { category: "http" },
              );
              const geoRows = await parseJsonArray(geo);
              const hits = narrowNominatimHits(geoRows);
              if (hits.length > 0) {
                setDestination({ lat: parseFloat(hits[0].lat), lng: parseFloat(hits[0].lon) });
              }
            } catch {
              /* geokodowanie opcjonalne */
            }
          }
        }
      } else {
        setSession(null);
        setDestination(null);
        setRouteWaypoints([]);
        setCustomerLocationId(null);
        setDistanceToDestKm(null);
      }
    } catch (e) {
      void sendRemoteLog(
        "ERROR",
        "WorkerClient fetchSessionAndPath",
        {
          error: e instanceof Error ? e.message : String(e),
        },
        { category: "session" },
      );
    }
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
          { category: "orders" },
        );
      } catch {
        /* zapis trasy opcjonalny */
      }
    },
    [customerLocationId, currentUser?.canEditRoute],
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
