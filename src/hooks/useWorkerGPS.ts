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
  const R = 6371e3; // metres
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

export function useWorkerGPS(
  session: any,
  setLocation: (loc: Coord) => void,
  setPathTraveled: (update: (prev: Coord[]) => Coord[]) => void,
  setTraveledKm: (update: (prev: number) => number) => void,
  setGpsStatus: (status: "waiting" | "active" | "error") => void
) {
  const watchIdRef = useRef<any>(null);

  useEffect(() => {
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

    const flushQueue = () => {
      if (!navigator.onLine) {
        setGpsStatus("waiting");
        return;
      }
      let queue: any[] = [];
      try { queue = JSON.parse(localStorage.getItem('werkit_gps_queue') || '[]'); } catch (e) { }
      if (queue.length === 0) return;

      fetch("/api/worker/gps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(queue),
        keepalive: true // Kluczowe dla działania w tle, instruuje system by dociągnął request po uśpieniu JS
      })
        .then(res => {
          if (res.ok) {
            localStorage.setItem('werkit_gps_queue', '[]');
            setGpsStatus("active");
          }
        })
        .catch(() => { });
    };

    const handleNewLoc = (newLoc: Coord) => {
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
      let queue: GPSQueueItem[] = [];
      try { queue = JSON.parse(localStorage.getItem('werkit_gps_queue') || '[]'); } catch (e) { }
      queue.push(payload);
      localStorage.setItem('werkit_gps_queue', JSON.stringify(queue));

      // Jeśli jesteśmy w tle (wygaszony ekran) JS ma ułamki sekund życia od pluginu.
      // NIE wolno opóźniać czasowo - natychmiast wrzucamy do flush.
      if (document.visibilityState === 'hidden' || queue.length >= 5) {
        flushQueue();
      }
    };

    if (Capacitor.isNativePlatform()) {
      setGpsStatus("waiting");
      if (BackgroundGeolocation && typeof BackgroundGeolocation.addWatcher === 'function') {
        BackgroundGeolocation.addWatcher(
          {
            backgroundMessage: "Aplikacja śledzi trasę pracownika w tle.",
            backgroundTitle: "Werkit - Rejestrowanie trasy",
            requestPermissions: true,
            stale: false,
            distanceFilter: 10 // Zmniejszono do 10m żeby ślad zgadzał się z drogami
          },
          function callback(location, error) {
            if (error) {
              setGpsStatus("error");
              return;
            }
            if (location) {
              handleNewLoc({ lat: location.latitude, lng: location.longitude, heading: location.bearing });
            }
          }
        ).then(watcherId => {
          watchIdRef.current = watcherId;
        });
      }
    } else if ("geolocation" in navigator) {
      setGpsStatus("waiting");
      watchIdRef.current = navigator.geolocation.watchPosition(
        async (pos) => {
          handleNewLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude, heading: pos.coords.heading });
        },
        (err) => {
          setGpsStatus("error");
        },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 } // Zwiększono dokładność fallbacku
      );
    } else {
      setGpsStatus("error");
    }

    // Standardowy interval dla działania na włączonym ekranie
    const flushInterval = setInterval(flushQueue, 30000);

    return () => {
      if (watchIdRef.current !== null) {
        if (Capacitor.isNativePlatform()) {
          if (BackgroundGeolocation && typeof BackgroundGeolocation.removeWatcher === 'function') {
            BackgroundGeolocation.removeWatcher({ id: watchIdRef.current });
          }
        } else {
          navigator.geolocation.clearWatch(watchIdRef.current);
        }
      }
      clearInterval(flushInterval);
    };
  }, [session, setLocation, setPathTraveled, setTraveledKm, setGpsStatus]);
}
