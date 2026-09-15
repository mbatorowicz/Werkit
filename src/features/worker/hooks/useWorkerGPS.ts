import { useEffect, useRef } from "react";
import type { Dispatch } from "react";
import { Capacitor } from "@capacitor/core";
import { sendRemoteLog } from "@/lib/remoteLogger";
import { GPSManager } from "@/lib/gpsManager";
import { backgroundGeolocation } from "@/features/worker/gps/backgroundGeolocationSingleton";
import {
  coordFromGeolocationCoords,
  coordFromNativeBackgroundReading,
  gpsRejectLogMeta,
} from "@/features/worker/gps/coordFromNativeReading";
import { requestIgnoreBatteryOptimizationsIfNeeded } from "@/features/worker/gps/batteryOptimization";
import {
  WORKER_BG_GEO_NOTIFICATION,
  WORKER_GPS_NATIVE_DISTANCE_FILTER_METERS,
  WORKER_GPS_QUEUE_FLUSH_INTERVAL_MS,
  WORKER_WEB_GEO_WATCH_OPTIONS,
} from "@/features/worker/gps/workerGpsConstants";
import type { WorkerRouteAction } from "@/features/worker/gps/workerRouteReducer";
import { shouldStartGpsWatcher } from "@/features/worker/gps/shouldStartGpsWatcher";
import { gpsPolicyFromSession } from "@/lib/categoryPolicy";
import type { Coord, Session } from "@/types/worker";

function clearGpsWatchId(watchIdRef: { current: string | number | null }) {
  if (watchIdRef.current === null) return;
  if (Capacitor.isNativePlatform()) {
    if (typeof backgroundGeolocation.removeWatcher === "function") {
      backgroundGeolocation.removeWatcher({ id: watchIdRef.current as string });
    }
  } else if (typeof navigator.geolocation?.clearWatch === "function") {
    navigator.geolocation.clearWatch(watchIdRef.current as number);
  }
  watchIdRef.current = null;
}

export function useWorkerGPS(
  session: Session | null,
  setLocation: (loc: Coord) => void,
  dispatchRoute: Dispatch<WorkerRouteAction>,
  setGpsStatus: (status: "waiting" | "active" | "error") => void,
  gpsTrackingEnabled?: boolean
) {
  const watchIdRef = useRef<string | number | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (!session) {
      clearGpsWatchId(watchIdRef);
      return;
    }

    const gpsPolicy = gpsPolicyFromSession(session);
    if (!shouldStartGpsWatcher({ gpsPolicy }, gpsTrackingEnabled)) {
      clearGpsWatchId(watchIdRef);
      if (gpsTrackingEnabled === false) {
        void GPSManager.clearQueue();
      }
      if (isMounted) setGpsStatus("active");
      return () => {
        isMounted = false;
        clearGpsWatchId(watchIdRef);
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
        await requestIgnoreBatteryOptimizationsIfNeeded();
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
              sendRemoteLog(
                "ERROR",
                "Błąd w BackgroundGeolocation.addWatcher",
                error as unknown as Record<string, unknown>,
                {
                  category: "gps",
                }
              );
              return;
            }
            if (!location) return;

            const coord = coordFromNativeBackgroundReading(location);
            if (!coord) {
              sendRemoteLog(
                "INFO",
                "Filtrowanie GPS: Odrzucono szpilkę",
                gpsRejectLogMeta(location.accuracy),
                { category: "gps" }
              );
              return;
            }
            handleNewLoc(coord);
          }
        );

        if (!isMounted) {
          backgroundGeolocation.removeWatcher({ id: watcherId });
        } else {
          watchIdRef.current = watcherId;
          setGpsStatus("active");
          sendRemoteLog(
            "INFO",
            "Uruchomiono BackgroundGeolocation.addWatcher",
            { id: watcherId },
            { category: "gps" }
          );
        }
      } catch (err) {
        sendRemoteLog(
          "ERROR",
          "Nie udało się uruchomić BackgroundGeolocation",
          err instanceof Error ? { error: err.message } : undefined,
          { category: "gps" }
        );
        if (isMounted) setGpsStatus("error");
      }
    };

    const startWebTracking = () => {
      setGpsStatus("waiting");
      if ("geolocation" in navigator) {
        watchIdRef.current = navigator.geolocation.watchPosition(
          (pos) => {
            const coord = coordFromGeolocationCoords(pos.coords);
            if (!coord) {
              sendRemoteLog(
                "INFO",
                "Filtrowanie GPS: Odrzucono szpilkę",
                gpsRejectLogMeta(pos.coords.accuracy),
                { category: "gps" }
              );
              return;
            }
            handleNewLoc(coord);
          },
          () => {
            if (isMounted) setGpsStatus("error");
          },
          WORKER_WEB_GEO_WATCH_OPTIONS
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
      clearGpsWatchId(watchIdRef);
      clearInterval(flushInterval);
    };
  }, [session, setLocation, dispatchRoute, setGpsStatus, gpsTrackingEnabled]);
}
