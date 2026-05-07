import { useEffect, useRef } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';
import type { BackgroundGeolocationPlugin } from '@capacitor-community/background-geolocation';

const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>('BackgroundGeolocation');

type Coord = {
  lat: number;
  lng: number;
  heading?: number | null;
};

type GPSQueueItem = Coord & { timestamp: string };

export function getDistance(a: Coord, b: Coord) {
  const R = 6371e3;
  const φ1 = a.lat * Math.PI / 180;
  const φ2 = b.lat * Math.PI / 180;
  const Δφ = (b.lat - a.lat) * Math.PI / 180;
  const Δλ = (b.lng - a.lng) * Math.PI / 180;

  const x = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return R * c;
}

import { sendRemoteLog } from '@/lib/remoteLogger';

const STORAGE_KEY = 'werkit_gps_queue';

const getQueue = (): GPSQueueItem[] => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
};

const saveQueue = (queue: GPSQueueItem[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
};

export function useWorkerGPS(
  session: any,
  setLocation: (loc: Coord) => void,
  setPathTraveled: (update: (prev: Coord[]) => Coord[]) => void,
  setTraveledKm: (update: (prev: number) => number) => void,
  setGpsStatus: (status: "waiting" | "active" | "error") => void
) {
  const watchIdRef = useRef<any>(null);
  const isFlushingRef = useRef(false);

  useEffect(() => {
    let isMounted = true; // Zabezpieczenie przed wyciekiem, jeśli sesja skończy się podczas odpalania GPS

    if (!session) {
      if (watchIdRef.current !== null) {
        if (Capacitor.isNativePlatform()) {
          if (BackgroundGeolocation && typeof BackgroundGeolocation.removeWatcher === 'function') {
            BackgroundGeolocation.removeWatcher({ id: watchIdRef.current });
          }
        } else {
          navigator.geolocation.clearWatch(watchIdRef.current);
        }
        watchIdRef.current = null;
      }
      return;
    }

    const flushQueue = async () => {
      if (!navigator.onLine) {
        setGpsStatus("waiting");
        return;
      }
      if (isFlushingRef.current) return;

      const queue = getQueue();
      if (queue.length === 0) return;

      isFlushingRef.current = true;
      const sentTimestamps = new Set(queue.map(q => q.timestamp));

      try {
        const res = await fetch("/api/worker/gps", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(queue),
          keepalive: true
        });

        if (res.ok && isMounted) {
          const updatedQueue = getQueue().filter(q => !sentTimestamps.has(q.timestamp));
          saveQueue(updatedQueue);
          setGpsStatus("active");
        }
      } catch (error) {
      } finally {
        isFlushingRef.current = false;
        if (getQueue().length > 0 && navigator.onLine && isMounted) {
          setTimeout(flushQueue, 100);
        }
      }
    };

    const handleNewLoc = (newLoc: Coord) => {
      if (!isMounted) return;
      setLocation(newLoc);

      setPathTraveled(prev => {
        if (prev.length > 0) {
          const lastLoc = prev[prev.length - 1];
          const distIncrement = getDistance(lastLoc, newLoc) / 1000;
          setTraveledKm(k => k + distIncrement);
        }
        return [...prev, newLoc];
      });

      const payload = { ...newLoc, timestamp: new Date().toISOString() };
      const currentQueue = getQueue();
      currentQueue.push(payload);
      saveQueue(currentQueue);

      flushQueue();
    };

    if (Capacitor.isNativePlatform()) {
      setGpsStatus("waiting");
      if (BackgroundGeolocation && typeof BackgroundGeolocation.addWatcher === 'function') {
        BackgroundGeolocation.addWatcher(
          {
            backgroundMessage: "Aplikacja śledzi trasę pracownika w tle.",
            backgroundTitle: "Werkit - Rejestrowanie trasy",
            requestPermissions: true,
            stale: true,
            distanceFilter: 10
          },
          function callback(location, error) {
            if (error) {
              if (isMounted) setGpsStatus("error");
              sendRemoteLog('ERROR', 'Błąd w BackgroundGeolocation.addWatcher', error);
              return;
            }
            if (location) {
              handleNewLoc({ lat: location.latitude, lng: location.longitude, heading: location.bearing });
            }
          }
        ).then(watcherId => {
          if (!isMounted) {
            BackgroundGeolocation.removeWatcher({ id: watcherId });
          } else {
            watchIdRef.current = watcherId;
            setGpsStatus("active");
            sendRemoteLog('INFO', 'Uruchomiono BackgroundGeolocation.addWatcher', { id: watcherId });
          }
        }).catch(err => {
            sendRemoteLog('ERROR', 'Nie udało się uruchomić BackgroundGeolocation', err);
        });
      }
    } else if ("geolocation" in navigator) {
      setGpsStatus("waiting");
      watchIdRef.current = navigator.geolocation.watchPosition(
        async (pos) => {
          handleNewLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude, heading: pos.coords.heading });
        },
        (err) => {
          if (isMounted) setGpsStatus("error");
        },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
      );
    } else {
      setGpsStatus("error");
    }

    const flushInterval = setInterval(flushQueue, 30000);

    return () => {
      isMounted = false;
      if (watchIdRef.current !== null) {
        if (Capacitor.isNativePlatform()) {
          if (BackgroundGeolocation && typeof BackgroundGeolocation.removeWatcher === 'function') {
            BackgroundGeolocation.removeWatcher({ id: watchIdRef.current });
          }
        } else {
          navigator.geolocation.clearWatch(watchIdRef.current);
        }
        watchIdRef.current = null;
      }
      clearInterval(flushInterval);
    };
  }, [session, setLocation, setPathTraveled, setTraveledKm, setGpsStatus]);
}
