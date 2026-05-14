import { useEffect, useRef } from "react";
import type { Dispatch } from "react";
import { Capacitor } from "@capacitor/core";
import { sendRemoteLog } from "@/lib/remoteLogger";
import { GPSManager } from "@/lib/gpsManager";
import { backgroundGeolocation } from "@/features/worker/gps/backgroundGeolocationSingleton";
import { coordFromNativeBackgroundReading } from "@/features/worker/gps/coordFromNativeReading";
import {
  WORKER_BG_GEO_NOTIFICATION,
  WORKER_GPS_NATIVE_DISTANCE_FILTER_METERS,
  WORKER_GPS_QUEUE_FLUSH_INTERVAL_MS,
  WORKER_WEB_GEO_WATCH_OPTIONS,
} from "@/features/worker/gps/workerGpsConstants";
import type { WorkerRouteAction } from "@/features/worker/hooks/workerRouteReducer";

import type { Coord, Session } from "@/types/worker";

export function useWorkerGPS(
  session: Session | null,
  setLocation: (loc: Coord) => void,
  dispatchRoute: Dispatch<WorkerRouteAction>,
  setGpsStatus: (status: "waiting" | "active" | "error") => void,
) {
  const watchIdRef = useRef<string | number | null>(null);

  useEffect(() => {
    let isMounted = true;

    const clearWatcher = () => {
      if (watchIdRef.current === null) return;
      if (Capacitor.isNativePlatform()) {
        if (typeof backgroundGeolocation.removeWatcher === "function") {
          backgroundGeolocation.removeWatcher({ id: watchIdRef.current as string });
        }
      } else {
        navigator.geolocation.clearWatch(watchIdRef.current as number);
      }
      watchIdRef.current = null;
    };

    if (!session) {
      clearWatcher();
      return;
    }

    if (session.categoryIsStationary) {
      clearWatcher();
      if (isMounted) setGpsStatus("active");
      return () => {
        isMounted = false;
        clearWatcher();
      };
    }

    const handleNewLoc = (newLoc: Coord) => {
      if (!isMounted) return;
      setLocation(newLoc);
      dispatchRoute({
        type: "gps",
        loc: { ...newLoc, recordedAt: new Date().toISOString() },
      });

      GPSManager.enqueue(newLoc);
      GPSManager.flushQueue(() => {
        if (isMounted) setGpsStatus("active");
      });
    };

    const startNativeTracking = async () => {
      setGpsStatus("waiting");
      try {
        if (typeof backgroundGeolocation.addWatcher !== "function") {
          if (isMounted) setGpsStatus("error");
          return;
        }

        const watcherId = await backgroundGeolocation.addWatcher(
          {
            ...WORKER_BG_GEO_NOTIFICATION,
            requestPermissions: true,
            stale: true,
            distanceFilter: WORKER_GPS_NATIVE_DISTANCE_FILTER_METERS,
          },
          (location, error) => {
            if (error) {
              if (isMounted) setGpsStatus("error");
              sendRemoteLog("ERROR", "Błąd w BackgroundGeolocation.addWatcher", error as unknown as Record<string, unknown>);
              return;
            }
            if (!location) return;

            const coord = coordFromNativeBackgroundReading(location);
            if (!coord) {
              if (typeof location.accuracy === "number") {
                sendRemoteLog("INFO", "Filtrowanie GPS: Odrzucono szpilkę", {
                  accuracy: location.accuracy,
                  lat: location.latitude,
                  lng: location.longitude,
                });
              }
              return;
            }
            handleNewLoc(coord);
          },
        );

        if (!isMounted) {
          backgroundGeolocation.removeWatcher({ id: watcherId });
        } else {
          watchIdRef.current = watcherId;
          setGpsStatus("active");
          sendRemoteLog("INFO", "Uruchomiono BackgroundGeolocation.addWatcher", { id: watcherId });
        }
      } catch (err) {
        sendRemoteLog(
          "ERROR",
          "Nie udało się uruchomić BackgroundGeolocation",
          err instanceof Error ? { error: err.message } : undefined,
        );
        if (isMounted) setGpsStatus("error");
      }
    };

    const startWebTracking = () => {
      setGpsStatus("waiting");
      if ("geolocation" in navigator) {
        watchIdRef.current = navigator.geolocation.watchPosition(
          (pos) =>
            handleNewLoc({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              heading: pos.coords.heading,
            }),
          () => {
            if (isMounted) setGpsStatus("error");
          },
          WORKER_WEB_GEO_WATCH_OPTIONS,
        );
      } else if (isMounted) {
        setGpsStatus("error");
      }
    };

    if (Capacitor.isNativePlatform()) {
      void startNativeTracking();
    } else {
      startWebTracking();
    }

    const flushInterval = setInterval(() => {
      GPSManager.flushQueue(() => {
        if (isMounted) setGpsStatus("active");
      });
    }, WORKER_GPS_QUEUE_FLUSH_INTERVAL_MS);

    return () => {
      isMounted = false;
      clearWatcher();
      clearInterval(flushInterval);
    };
  }, [session, setLocation, dispatchRoute, setGpsStatus]);
}
