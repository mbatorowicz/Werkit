"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GPSManager } from "@/lib/gpsManager";
import { sendRemoteLog } from "@/lib/remoteLogger";
import { buildWorkerSessionTimeline } from "@/features/worker/lib/workerSessionTimeline";
import { useWorkerSessionSync } from "@/features/worker/hooks/useWorkerSessionSync";
import { useWorkerGPS } from "@/features/worker/hooks/useWorkerGPS";
import type { AppSettings, Coord, InitialWorkerData, Session, TimelineItem, UserData, WorkOrder } from "@/types/worker";

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
  const [pathTraveled, setPathTraveled] = useState<Coord[]>([]);
  const [destination, setDestination] = useState<Coord | null>(null);
  const destinationRef = useRef<Coord | null>(null);
  useEffect(() => {
    destinationRef.current = destination;
  }, [destination]);
  const [distanceToDestKm, setDistanceToDestKm] = useState<number | null>(null);
  const [traveledKm, setTraveledKm] = useState(0);

  const [gpsStatus, setGpsStatus] = useState<"waiting" | "active" | "error">("waiting");

  const fetchSessionAndPath = useCallback(async (showLoader = true, fetchGpsPath = true) => {
    if (showLoader) setIsLoading(true);
    try {
      const [resSess, resOrders] = await Promise.all([
        fetch("/api/worker/session", { cache: "no-store" }),
        fetch("/api/worker/work-orders", { cache: "no-store" }),
      ]);

      if (!resSess.ok) throw new Error(`Session fetch failed: ${resSess.status}`);
      if (!resOrders.ok) throw new Error(`Orders fetch failed: ${resOrders.status}`);

      const sessData = (await resSess.json()) as Record<string, unknown>;
      const ordersData: unknown = await resOrders.json();
      setWorkOrders(Array.isArray(ordersData) ? (ordersData as WorkOrder[]) : []);

      const stationary = Boolean((sessData?.session as Session | undefined)?.categoryIsStationary);
      if (stationary) {
        setPathTraveled([]);
        setTraveledKm(0);
        setDestination(null);
        setDistanceToDestKm(null);
      }

      if (fetchGpsPath && sessData?.session && !stationary) {
        try {
          const resPath = await fetch("/api/worker/gps", { cache: "no-store" });
          const pathData = (await resPath.json()) as { logs?: Coord[] };
          if (pathData.logs) {
            setPathTraveled(pathData.logs);
            let dist = 0;
            for (let i = 1; i < pathData.logs.length; i++) {
              dist += GPSManager.getDistance(pathData.logs[i - 1], pathData.logs[i]);
            }
            setTraveledKm(dist / 1000);
          }
        } catch {
          /* ścieżka GPS opcjonalna */
        }
      }

      if (sessData.settings) setSettings(sessData.settings as AppSettings);
      if (sessData.user) setCurrentUser(sessData.user as UserData);

      if (sessData.session) {
        setSession(sessData.session as Session);
        setTimelineEvents(buildWorkerSessionTimeline(sessData.events, sessData.notes));

        const sessStationary = Boolean((sessData.session as Session).categoryIsStationary);
        if (!sessStationary) {
          const s = sessData.session as Session;
          if (s.customerLat && s.customerLng) {
            setDestination({ lat: parseFloat(s.customerLat), lng: parseFloat(s.customerLng) });
          } else if (s.customerAddress && !destinationRef.current) {
            try {
              const geo = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(s.customerAddress)}`,
              );
              const geoData = (await geo.json()) as { lat?: string; lon?: string }[];
              if (geoData?.length > 0 && geoData[0].lat && geoData[0].lon) {
                setDestination({ lat: parseFloat(geoData[0].lat), lng: parseFloat(geoData[0].lon) });
              }
            } catch {
              /* geokodowanie opcjonalne */
            }
          }
        }
      } else {
        setSession(null);
        setDestination(null);
        setDistanceToDestKm(null);
      }
    } catch (e) {
      void sendRemoteLog("ERROR", "WorkerClient fetchSessionAndPath", {
        error: e instanceof Error ? e.message : String(e),
      });
    }
    if (showLoader) setIsLoading(false);
  }, []);

  useWorkerSessionSync(initialData, fetchSessionAndPath);

  useWorkerGPS(session, setLocation, setPathTraveled, setTraveledKm, setGpsStatus);

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
    distanceToDestKm,
    traveledKm,
    gpsStatus,
    fetchSessionAndPath,
    setDistanceToDestKm,
  };
}
