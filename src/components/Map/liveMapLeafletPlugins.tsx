"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import type { TimelineItem } from "@/types/worker";

/** Podążanie za pojazdem, gdy nie ma jeszcze trasy ani celu na mapie. */
export function FollowPan({
  lat,
  lng,
  active,
  followEnabled,
}: {
  lat: number;
  lng: number;
  active: boolean;
  followEnabled: boolean;
}) {
  const map = useMap();
  useEffect(() => {
    if (!active || !followEnabled) return;
    map.panTo([lat, lng], { animate: true });
  }, [lat, lng, map, active, followEnabled]);
  return null;
}

/** Dopasowuje widok do trasy, śladu, celu i punktów na osi czasu (z lekkim opóźnieniem, żeby nie „skakało”). */
export function FitContentDebounced({
  currentLocation,
  pathTraveled,
  destination,
  routeToDest,
  events,
  enabled,
}: {
  currentLocation: { lat: number; lng: number };
  pathTraveled: { lat: number; lng: number }[];
  destination: { lat: number; lng: number } | null;
  routeToDest: [number, number][];
  events: TimelineItem[];
  enabled: boolean;
}) {
  const map = useMap();
  const snapshotRef = useRef({
    currentLocation,
    pathTraveled,
    destination,
    routeToDest,
    events,
  });

  useEffect(() => {
    snapshotRef.current = { currentLocation, pathTraveled, destination, routeToDest, events };
  }, [currentLocation, pathTraveled, destination, routeToDest, events]);

  const trigger = useMemo(
    () =>
      JSON.stringify({
        dest: destination ? [destination.lat, destination.lng] : null,
        plen: pathTraveled.length,
        rlen: routeToDest.length,
        elen: events.length,
        lastPath:
          pathTraveled.length > 0
            ? [pathTraveled[pathTraveled.length - 1].lat, pathTraveled[pathTraveled.length - 1].lng]
            : null,
        routeTail: routeToDest.length > 0 ? routeToDest[routeToDest.length - 1] : null,
      }),
    [destination, pathTraveled, routeToDest, events.length],
  );

  useEffect(() => {
    if (!enabled) return;

    const id = window.setTimeout(() => {
      const snap = snapshotRef.current;
      const pts: L.LatLngTuple[] = [[snap.currentLocation.lat, snap.currentLocation.lng]];
      snap.pathTraveled.forEach((p) => pts.push([p.lat, p.lng]));
      if (snap.destination) pts.push([snap.destination.lat, snap.destination.lng]);
      snap.routeToDest.forEach((c) => pts.push(c));
      snap.events.forEach((e) => pts.push([e.lat, e.lng]));

      if (pts.length === 0) return;

      if (pts.length === 1) {
        map.flyTo(pts[0], 16, { duration: 0.55 });
        return;
      }

      try {
        const b = L.latLngBounds(pts);
        if (!b.isValid()) {
          map.flyTo(pts[0], 16, { duration: 0.55 });
          return;
        }
        map.fitBounds(b, { padding: [52, 52], maxZoom: 17, animate: true });
      } catch {
        map.flyTo([snap.currentLocation.lat, snap.currentLocation.lng], 15, { duration: 0.55 });
      }
    }, 900);

    return () => window.clearTimeout(id);
  }, [enabled, trigger, map]);

  return null;
}

/** U pracownika w trasie: mapa śledzi bieżący punkt na środku widoku (dopóki użytkownik nie przejmie steru). */
export function FollowPivotCenter({
  lat,
  lng,
  active,
  followEnabled,
}: {
  lat: number;
  lng: number;
  active: boolean;
  followEnabled: boolean;
}) {
  const map = useMap();
  useEffect(() => {
    if (!active || !followEnabled) return;
    map.panTo([lat, lng], { animate: true, duration: 0.35 });
  }, [lat, lng, map, active, followEnabled]);
  return null;
}

function isUserDomEvent(e: L.LeafletEvent): boolean {
  const oe = (e as { originalEvent?: Event }).originalEvent;
  return Boolean(oe);
}

/** Przeciągnięcie lub gest zoomu = Leaflet bez „walki” ze śledzeniem GPS. */
export function UserTakeoverOnMapGesture({ onTakeover }: { onTakeover: () => void }) {
  const onTakeoverCb = useCallback(() => {
    onTakeover();
  }, [onTakeover]);

  useMapEvents({
    dragstart: (e) => {
      if (isUserDomEvent(e)) onTakeoverCb();
    },
    zoomstart: (e) => {
      if (isUserDomEvent(e)) onTakeoverCb();
    },
  });
  return null;
}

/** Kafelki po zmianie rozmiaru kontenera (flex, mobile) — bez tego bywa pusta mapa. */
export function MapInvalidateOnResize() {
  const map = useMap();
  useEffect(() => {
    const el = map.getContainer();
    if (typeof ResizeObserver === "undefined") {
      queueMicrotask(() => {
        map.invalidateSize({ animate: false });
      });
      return;
    }
    const ro = new ResizeObserver(() => {
      map.invalidateSize({ animate: false });
    });
    ro.observe(el);
    queueMicrotask(() => {
      map.invalidateSize({ animate: false });
    });
    return () => {
      ro.disconnect();
    };
  }, [map]);
  return null;
}
