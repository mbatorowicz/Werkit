"use client";

import { useCallback, useEffect, useRef } from "react";
import { useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { isMapClickBlocked } from "@/lib/map/blockMapClickBriefly";
import { isLeafletUiClick } from "@/lib/map/isLeafletUiClick";
import { LocateFixed, Plus, Minus, Navigation, ExternalLink } from "lucide-react";
import { getDictionary } from "@/i18n";

// ---------------------------------------------------------------------------
// Safe area offsets — works on mobile with notches / status bars
// ---------------------------------------------------------------------------
export const SAFE_TOP = "max(env(safe-area-inset-top, 0px), 8px)";
export const SAFE_BOTTOM = "env(safe-area-inset-bottom, 0px)";

// ---------------------------------------------------------------------------
// Klik na mapę — tryb dodawania / usuwania punktów pośrednich
// ---------------------------------------------------------------------------
export type WaypointMode = "add" | "remove" | null;

export function RouteWaypointClickLayer({
  mode,
  onAdd,
}: {
  mode: WaypointMode;
  onAdd?: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      if (mode !== "add" || !onAdd || isMapClickBlocked() || isLeafletUiClick(e)) return;
      onAdd(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// ---------------------------------------------------------------------------
// Wspólny komponent przycisków + / - dla punktów pośrednich
// ---------------------------------------------------------------------------
export function WaypointControls({
  waypointMode,
  onModeChange,
  hasDestination,
  waypointCount,
  onNavigate,
  compact = false,
}: {
  waypointMode: WaypointMode;
  onModeChange: (mode: WaypointMode) => void;
  hasDestination: boolean;
  waypointCount: number;
  onNavigate?: () => void;
  /** Mniejsze przyciski (32px) dla CustomerRoutePlannerMap, domyślnie 40px. */
  compact?: boolean;
}) {
  const dict = getDictionary().admin.map;
  const isAddMode = waypointMode === "add";
  const isRemoveMode = waypointMode === "remove";
  const size = compact ? "w-8 h-8" : "w-10 h-10";
  const iconSize = compact ? "h-4 w-4" : "h-5 w-5";

  const handleAddClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onModeChange(isAddMode ? null : "add");
    },
    [isAddMode, onModeChange]
  );

  const handleRemoveClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      // Toggle remove mode — analogicznie do "+"
      onModeChange(isRemoveMode ? null : "remove");
    },
    [isRemoveMode, onModeChange]
  );

  return (
    <div
      className="absolute left-3 z-[1001] flex items-center gap-1.5"
      style={{ top: `calc(${SAFE_TOP} + 8px)` }}
    >
      <button
        type="button"
        onClick={handleAddClick}
        disabled={!hasDestination}
        className={`flex items-center justify-center ${size} rounded-lg shadow-lg border transition active:scale-95 backdrop-blur-sm disabled:opacity-40 disabled:cursor-not-allowed ${
          isAddMode
            ? "bg-emerald-600 text-white border-emerald-500 hover:bg-emerald-500"
            : "bg-white/90 dark:bg-zinc-800/90 text-emerald-600 dark:text-emerald-400 border-zinc-200 dark:border-zinc-700 hover:bg-white dark:hover:bg-zinc-700"
        }`}
        aria-label={dict.addWaypoint}
        title={isAddMode ? dict.cancelAdd : dict.addWaypoint}
      >
        <Plus className={iconSize} />
      </button>

      <button
        type="button"
        onClick={handleRemoveClick}
        disabled={waypointCount === 0}
        className={`flex items-center justify-center ${size} rounded-lg shadow-lg border transition active:scale-95 backdrop-blur-sm disabled:opacity-40 disabled:cursor-not-allowed ${
          isRemoveMode
            ? "bg-red-600 text-white border-red-500 hover:bg-red-500"
            : "bg-white/90 dark:bg-zinc-800/90 text-red-500 dark:text-red-400 border-zinc-200 dark:border-zinc-700 hover:bg-white dark:hover:bg-zinc-700"
        }`}
        aria-label={dict.removeWaypoint}
        title={isRemoveMode ? dict.cancelRemove : dict.removeWaypoint}
      >
        <Minus className={iconSize} />
      </button>

      {onNavigate && hasDestination ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onNavigate();
          }}
          className={`flex items-center justify-center ${size} rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-700 bg-white/90 dark:bg-zinc-800/90 text-emerald-600 dark:text-emerald-400 hover:bg-white dark:hover:bg-zinc-700 transition active:scale-95 backdrop-blur-sm`}
          aria-label={dict.openGoogleMaps}
          title={dict.openGoogleMaps}
        >
          <Navigation className={iconSize} />
          <ExternalLink
            className={`${compact ? "h-2.5 w-2.5" : "h-3 w-3"} ml-0.5 text-emerald-300`}
          />
        </button>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ustawia początkowy widok mapy przy pierwszym renderze, potem nic nie robi
// ---------------------------------------------------------------------------
export function MapInitialView({ center, zoom }: { center: [number, number]; zoom: number }) {
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
  const dict = getDictionary().admin.map;
  const map = useMap();

  const handleLocate = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      map.flyTo([currentLocation.lat, currentLocation.lng], Math.max(map.getZoom(), 15), {
        duration: 0.5,
      });
    },
    [map, currentLocation.lat, currentLocation.lng]
  );

  return (
    <button
      type="button"
      onClick={handleLocate}
      className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/90 dark:bg-zinc-800/90 text-emerald-600 dark:text-emerald-400 shadow-lg border border-zinc-200 dark:border-zinc-700 transition hover:bg-white dark:hover:bg-zinc-700 active:scale-95 backdrop-blur-sm"
      aria-label={dict.centerOnLocation}
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
// Otwiera Google Maps z trasą (opcjonalnie z waypointami)
// ---------------------------------------------------------------------------
export function openGoogleNavigation(
  dest: { lat: number; lng: number },
  origin?: { lat: number; lng: number } | null,
  waypoints?: { lat: number; lng: number }[]
) {
  const d = `${dest.lat},${dest.lng}`;
  const o = origin ? `${origin.lat},${origin.lng}` : undefined;
  const wp =
    waypoints && waypoints.length > 0
      ? waypoints.map((w) => `${w.lat},${w.lng}`).join("|")
      : undefined;
  const params = new URLSearchParams();
  if (o) params.set("origin", o);
  params.set("destination", d);
  params.set("travelmode", "driving");
  if (wp) params.set("waypoints", wp);
  const url = `https://www.google.com/maps/dir/?api=1&${params.toString()}`;
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
