"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { MapContainer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import { WerkitTileLayer } from "@/components/Map/WerkitTileLayer";
import { RouteWaypointMarkers } from "@/components/Map/RouteWaypointMarkers";
import "leaflet/dist/leaflet.css";
import { getDictionary } from "@/i18n";
import type { Coord, TimelineItem } from "@/types/worker";
import {
  MapInvalidateOnResize,
} from "./liveMapLeafletPlugins";
import {
  createCurrentLocationIcon,
  iconDest,
  iconEvent,
  iconNote,
  iconPhoto,
  iconStart,
} from "./liveMapIcons";
import { TraveledPathLayers } from "./TraveledPathLayers";
import { useOsrmRouteToDestination } from "./useOsrmRouteToDestination";
import { isMapClickBlocked } from "@/lib/map/blockMapClickBriefly";
import { isLeafletUiClick } from "@/lib/map/isLeafletUiClick";
import {
  X,
  Navigation,
  ExternalLink,
  LocateFixed,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Safe area top offset — works on mobile with notches / status bars
// ---------------------------------------------------------------------------
const SAFE_TOP = "max(env(safe-area-inset-top, 0px), 8px)";
const SAFE_BOTTOM = "env(safe-area-inset-bottom, 0px)";

// ---------------------------------------------------------------------------
// Helper: otwiera Google Maps z trasą
// ---------------------------------------------------------------------------
function openGoogleNavigation(
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
// Sub-komponent: klik na mapę dodaje punkt pośredni (tylko w pełnoekranowym)
// ---------------------------------------------------------------------------
function RouteWaypointClickLayer({
  editable,
  onAdd,
}: {
  editable: boolean;
  onAdd?: (lat: number, lng: number) => void;
}) {
  const map = useMap();
  useEffect(() => {
    if (!editable || !onAdd) return;
    const handler = (e: L.LeafletMouseEvent) => {
      if (isMapClickBlocked() || isLeafletUiClick(e)) return;
      onAdd(e.latlng.lat, e.latlng.lng);
    };
    map.on("click", handler);
    return () => {
      map.off("click", handler);
    };
  }, [map, editable, onAdd]);
  return null;
}

// ---------------------------------------------------------------------------
// Sub-komponent: synchronizuje zoom/center z małej mapy do pełnoekranowej
// ---------------------------------------------------------------------------
function MapStateSync({
  center,
  zoom,
}: {
  center: [number, number];
  zoom: number;
}) {
  const map = useMap();
  const initial = useRef(true);

  useEffect(() => {
    if (initial.current) {
      initial.current = false;
      map.setView(center, zoom, { animate: false });
    } else {
      map.setView(center, zoom, { animate: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- center is a tuple [number, number]; center[0]/center[1] are the actual deps
  }, [center[0], center[1], zoom, map]);

  return null;
}

// ---------------------------------------------------------------------------
// Sub-komponent: przycisk "Wyśrodkuj" (centruje na bieżącej pozycji)
// ---------------------------------------------------------------------------
function LocateMeButton({
  currentLocation,
}: {
  currentLocation: { lat: number; lng: number };
}) {
  const map = useMap();

  const handleLocate = useCallback(() => {
    map.flyTo([currentLocation.lat, currentLocation.lng], Math.max(map.getZoom(), 15), {
      duration: 0.5,
    });
  }, [map, currentLocation.lat, currentLocation.lng]);

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
// Props
// ---------------------------------------------------------------------------
interface FullScreenMapModalProps {
  open: boolean;
  onClose: () => void;
  currentLocation: { lat: number; lng: number; heading?: number | null };
  pathTraveled: Coord[];
  destination: { lat: number; lng: number } | null;
  plannedRouteWaypoints?: { lat: number; lng: number }[];
  events?: TimelineItem[];
  onEventClick?: (id: string) => void;
  /** Zoom i centrum do zsynchronizowania z mini-mapą */
  center: [number, number];
  zoom: number;
  /** Edycja trasy (dodawanie punktów pośrednich) — aktywna tylko w pełnoekranowym widoku. */
  editableRoute?: boolean;
  onAddRouteWaypoint?: (lat: number, lng: number) => void;
  onPlannedRouteWaypointsChange?: (next: { lat: number; lng: number }[]) => void;
  /** Nazwa celu. */
  destinationName?: string;
}

// ---------------------------------------------------------------------------
// Komponent
// ---------------------------------------------------------------------------
export default function FullScreenMapModal({
  open,
  onClose,
  currentLocation,
  pathTraveled,
  destination,
  plannedRouteWaypoints = [],
  events = [],
  onEventClick,
  center,
  zoom,
  editableRoute = false,
  onAddRouteWaypoint,
  onPlannedRouteWaypointsChange,
  destinationName,
}: FullScreenMapModalProps) {
  const dict = getDictionary().admin.map;
  const customersDict = getDictionary().admin.customers;

  const routeToDest = useOsrmRouteToDestination(
    currentLocation,
    destination,
    undefined,
    undefined,
    plannedRouteWaypoints,
  );

  const currentMarkerIcon = useMemo(
    () =>
      createCurrentLocationIcon({
        showHeadingNeedle: false,
        heading: currentLocation.heading,
      }),
    [currentLocation.heading],
  );

  // Blokada scrolla body gdy modal otwarty
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-black">
      {/* Mapa na pełnym ekranie — zajmuje całe dostępne miejsce */}
      <div className="flex-1 w-full relative">
        {/* Floating close button — zawsze widoczny, z safe-area na mobile */}
        <button
          type="button"
          onClick={onClose}
          className="absolute left-4 z-[1001] flex items-center gap-2 rounded-full bg-black/70 backdrop-blur-md px-4 py-2.5 text-sm font-medium text-white shadow-lg border border-white/15 transition hover:bg-black/90 active:scale-95"
          style={{ top: `calc(${SAFE_TOP} + 8px)` }}
        >
          <X className="h-4 w-4" />
          <span>{dict.closeFullscreen}</span>
        </button>

        {/* Przycisk "Nawiguj" — otwiera Google Maps z trasą, tylko gdy jest destination */}
        {destination && (
          <button
            type="button"
            onClick={() => openGoogleNavigation(destination, currentLocation)}
            className="absolute right-4 z-[1001] flex items-center gap-2 rounded-full bg-emerald-600/90 backdrop-blur-md px-5 py-3 text-sm font-semibold text-white shadow-lg border border-emerald-500/30 transition hover:bg-emerald-500 active:scale-95"
            style={{ top: `calc(${SAFE_TOP} + 8px)` }}
          >
            <Navigation className="h-4 w-4" />
            <span>{dict.navigateTo}</span>
            <ExternalLink className="h-3.5 w-3.5 text-emerald-200" />
          </button>
        )}

        <MapContainer
          center={center}
          zoom={zoom}
          style={{ height: "100%", width: "100%" }}
          zoomControl={false}
          scrollWheelZoom
          doubleClickZoom
          dragging
          touchZoom
          boxZoom
          keyboard
        >
          <WerkitTileLayer />

          <MapInvalidateOnResize />
          <MapStateSync center={center} zoom={zoom} />

          <RouteWaypointClickLayer editable={editableRoute} onAdd={onAddRouteWaypoint} />

          <TraveledPathLayers path={pathTraveled} />

          <RouteWaypointMarkers
            waypoints={plannedRouteWaypoints}
            editable={Boolean(editableRoute && onPlannedRouteWaypointsChange)}
            onWaypointsChange={onPlannedRouteWaypointsChange ?? (() => {})}
            deleteLabel={customersDict.routeDeleteWaypoint}
          />

          {pathTraveled.length > 0 ? (
            <Marker position={[pathTraveled[0].lat, pathTraveled[0].lng]} icon={iconStart}>
              <Popup>{dict.startPoint}</Popup>
            </Marker>
          ) : null}

          {/* Trasa — przerywana czerwona linia (podgląd) */}
          {routeToDest.length > 0 ? (
            <Polyline positions={routeToDest} color="#ef4444" weight={4} dashArray="5, 10" opacity={0.8} />
          ) : null}

          {events.map((ev, i) => (
            <Marker
              key={ev.id || String(i)}
              position={[ev.lat, ev.lng]}
              icon={ev.type === "photo" ? iconPhoto : ev.type === "note" ? iconNote : iconEvent}
              eventHandlers={{
                click: () => onEventClick?.(ev.id),
              }}
            >
              <Popup>
                <div className="flex flex-col gap-2 min-w-[150px] max-w-[250px]">
                  <p className="font-semibold m-0">{ev.type === "photo" ? "Zdjęcie" : "Notatka"}</p>
                  {ev.type === "note" ? <p className="text-sm italic m-0 break-words">{ev.content}</p> : null}
                </div>
              </Popup>
            </Marker>
          ))}

          {destination ? (
            <Marker position={[destination.lat, destination.lng]} icon={iconDest}>
              <Popup>{dict.destination}</Popup>
            </Marker>
          ) : null}

          <Marker position={[currentLocation.lat, currentLocation.lng]} icon={currentMarkerIcon}>
            <Popup>{dict.currentLocation}</Popup>
          </Marker>

          {/* Locate me button (inside MapContainer for Leaflet context) */}
          <LocateMeButton currentLocation={currentLocation} />
        </MapContainer>
      </div>
    </div>
  );
}
