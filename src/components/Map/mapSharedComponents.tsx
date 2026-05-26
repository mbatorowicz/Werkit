"use client";

import { useCallback, useEffect, useRef } from "react";
import { useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { isMapClickBlocked } from "@/lib/map/blockMapClickBriefly";
import { isLeafletUiClick } from "@/lib/map/isLeafletUiClick";
import { LocateFixed } from "lucide-react";

// ---------------------------------------------------------------------------
// Safe area offsets — works on mobile with notches / status bars
// ---------------------------------------------------------------------------
export const SAFE_TOP = "max(env(safe-area-inset-top, 0px), 8px)";
export const SAFE_BOTTOM = "env(safe-area-inset-bottom, 0px)";

// ---------------------------------------------------------------------------
// Klik na mapę dodaje punkt pośredni
// ---------------------------------------------------------------------------
export function RouteWaypointClickLayer({
  editable,
  onAdd,
}: {
  editable: boolean;
  onAdd?: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      if (!editable || !onAdd || isMapClickBlocked() || isLeafletUiClick(e)) return;
      onAdd(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// ---------------------------------------------------------------------------
// Ustawia początkowy widok mapy przy pierwszym renderze, potem nic nie robi
// ---------------------------------------------------------------------------
export function MapInitialView({
  center,
  zoom,
}: {
  center: [number, number];
  zoom: number;
}) {
  const map = useMap();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    map.setView(center, zoom, { animate: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

// ---------------------------------------------------------------------------
// Przycisk "Wyśrodkuj" (centruje na bieżącej pozycji)
// ---------------------------------------------------------------------------
export function LocateMeButton({
  currentLocation,
}: {
  currentLocation: { lat: number; lng: number };
}) {
  const map = useMap();

  const handleLocate = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      map.flyTo([currentLocation.lat, currentLocation.lng], Math.max(map.getZoom(), 15), {
        duration: 0.5,
      });
    },
    [map, currentLocation.lat, currentLocation.lng],
  );

  return (
    <button
      type="button"
      onClick={handleLocate}
      className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/90 dark:bg-zinc-800/90 text-emerald-600 dark:text-emerald-400 shadow-lg border border-zinc-200 dark:border-zinc-700 transition hover:bg-white dark:hover:bg-zinc-700 active:scale-95 backdrop-blur-sm"
      aria-label="Center on my location"
      style={{
        position: "absolute",
        bottom: `calc(${SAFE_BOTTOM} + 100px)`,
        right: "12px",
        zIndex: 1001,
      }}
    >
      <LocateFixed className="h-5 w-5" />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Otwiera Google Maps z trasą
// ---------------------------------------------------------------------------
export function openGoogleNavigation(
  dest: { lat: number; lng: number },
  origin?: { lat: number; lng: number } | null,
) {
  const d = `${dest.lat},${dest.lng}`;
  const o = origin ? `${origin.lat},${origin.lng}` : undefined;
  const url = o
    ? `https://www.google.com/maps/dir/?api=1&origin=${o}&destination=${d}&travelmode=driving`
    : `https://www.google.com/maps/dir/?api=1&destination=${d}&travelmode=driving`;
  window.open(url, "_blank", "noopener,noreferrer");
}

// ---------------------------------------------------------------------------
// Kafelki po zmianie rozmiaru kontenera (flex, mobile)
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Leaflet gesture detection — user drag/zoom = takeover from GPS follow
// ---------------------------------------------------------------------------
function isUserDomEvent(e: L.LeafletEvent): boolean {
  const oe = (e as { originalEvent?: Event }).originalEvent;
  return Boolean(oe);
}

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
