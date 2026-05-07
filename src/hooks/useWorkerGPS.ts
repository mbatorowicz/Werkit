import { useEffect, useRef } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';
import type { BackgroundGeolocationPlugin } from '@capacitor-community/background-geolocation';
import { sendRemoteLog } from '@/lib/remoteLogger';
import { GPSManager } from '@/lib/gpsManager';
import type { Coord, Session } from '@/types/worker';

const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>('BackgroundGeolocation');

export function useWorkerGPS(
  session: Session | null,
  setLocation: (loc: Coord) => void,
  setPathTraveled: (update: (prev: Coord[]) => Coord[]) => void,
  setTraveledKm: (update: (prev: number) => number) => void,
  setGpsStatus: (status: "waiting" | "active" | "error") => void
) {
  const watchIdRef = useRef<string | number | null>(null);

  useEffect(() => {
    let isMounted = true;

    const clearWatcher = () => {
      if (watchIdRef.current !== null) {
        if (Capacitor.isNativePlatform()) {
          if (BackgroundGeolocation && typeof BackgroundGeolocation.removeWatcher === 'function') {
            BackgroundGeolocation.removeWatcher({ id: watchIdRef.current as string });
          }
        } else {
          navigator.geolocation.clearWatch(watchIdRef.current as number);
        }
        watchIdRef.current = null;
      }
    };

    if (!session) {
      clearWatcher();
      return;
    }

    const handleNewLoc = (newLoc: Coord) => {
      if (!isMounted) return;
      setLocation(newLoc);

      setPathTraveled(prev => {
        if (prev.length > 0) {
          const lastLoc = prev[prev.length - 1];
          const distIncrement = GPSManager.getDistance(lastLoc, newLoc) / 1000;
          setTraveledKm(k => k + distIncrement);
        }
        return [...prev, newLoc];
      });

      GPSManager.enqueue(newLoc);
      GPSManager.flushQueue(() => {
        if (isMounted) setGpsStatus("active");
      });
    };

    const startNativeTracking = async () => {
      setGpsStatus("waiting");
      try {
        if (BackgroundGeolocation && typeof BackgroundGeolocation.addWatcher === 'function') {
          const watcherId = await BackgroundGeolocation.addWatcher(
            {
              backgroundMessage: "Aplikacja śledzi trasę pracownika w tle.",
              backgroundTitle: "Werkit - Rejestrowanie trasy",
              requestPermissions: true,
              stale: true,
              distanceFilter: 10
            },
            (location, error) => {
              if (error) {
                if (isMounted) setGpsStatus("error");
                sendRemoteLog('ERROR', 'Błąd w BackgroundGeolocation.addWatcher', error as unknown as Record<string, unknown>);
                return;
              }
              if (location) {
                if (location.accuracy && location.accuracy > 40) {
                  sendRemoteLog('INFO', 'Filtrowanie GPS: Odrzucono szpilkę', { accuracy: location.accuracy, lat: location.latitude, lng: location.longitude });
                  return;
                }
                handleNewLoc({ lat: location.latitude, lng: location.longitude, heading: location.bearing });
              }
            }
          );

          if (!isMounted) {
            BackgroundGeolocation.removeWatcher({ id: watcherId });
          } else {
            watchIdRef.current = watcherId;
            setGpsStatus("active");
            sendRemoteLog('INFO', 'Uruchomiono BackgroundGeolocation.addWatcher', { id: watcherId });
          }
        } else {
          if (isMounted) setGpsStatus("error");
        }
      } catch (err) {
        sendRemoteLog('ERROR', 'Nie udało się uruchomić BackgroundGeolocation', err instanceof Error ? { error: err.message } : undefined);
        if (isMounted) setGpsStatus("error");
      }
    };

    const startWebTracking = () => {
      setGpsStatus("waiting");
      if ("geolocation" in navigator) {
        watchIdRef.current = navigator.geolocation.watchPosition(
          (pos) => handleNewLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude, heading: pos.coords.heading }),
          (err) => { if (isMounted) setGpsStatus("error"); },
          { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
        );
      } else {
        if (isMounted) setGpsStatus("error");
      }
    };

    if (Capacitor.isNativePlatform()) {
      startNativeTracking();
    } else {
      startWebTracking();
    }

    const flushInterval = setInterval(() => {
      GPSManager.flushQueue(() => {
        if (isMounted) setGpsStatus("active");
      });
    }, 30000);

    return () => {
      isMounted = false;
      clearWatcher();
      clearInterval(flushInterval);
    };
  }, [session, setLocation, setPathTraveled, setTraveledKm, setGpsStatus]);
}
