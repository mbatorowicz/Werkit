"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GPSManager } from "@/lib/gpsManager";
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
        setPathTraveled([]);
        setTraveledKm(0);
        setDestination(null);
        setDistanceToDestKm(null);
      }

      if (fetchGpsPath && sessionRowEarly && !stationary) {
        try {
          const resPath = await fetch("/api/worker/gps", { cache: "no-store" });
          const pathBody = await parseJsonUnknown(resPath);
          const logs = narrowGpsPathLogs(pathBody);
          if (logs.length > 0) {
            setPathTraveled(logs);
            let dist = 0;
            for (let i = 1; i < logs.length; i++) {
              dist += GPSManager.getDistance(logs[i - 1], logs[i]);
            }
            setTraveledKm(dist / 1000);
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
          if (s.customerLat && s.customerLng) {
            setDestination({ lat: parseFloat(s.customerLat), lng: parseFloat(s.customerLng) });
          } else if (s.customerAddress && !destinationRef.current) {
            try {
              const geo = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(s.customerAddress)}`,
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
