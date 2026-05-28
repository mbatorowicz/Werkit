"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, Popup, Polyline } from "react-leaflet";
import { WerkitTileLayer } from "@/components/Map/WerkitTileLayer";
import { RouteWaypointMarkers } from "@/components/Map/RouteWaypointMarkers";
import "leaflet/dist/leaflet.css";
import { getDictionary } from "@/i18n";
import type { Coord, TimelineItem } from "@/types/worker";
import {
  MapInvalidateOnResize,
  MapInitialView,
  LocateMeButton,
  openGoogleNavigation,
  RouteWaypointClickLayer,
  SAFE_TOP,
  WaypointControls,
  type WaypointMode,
} from "./mapSharedComponents";
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
import {
  X,
  Navigation,
  ExternalLink,
} from "lucide-react";

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
  editableRoute = false,
  onAddRouteWaypoint,
  onPlannedRouteWaypointsChange,
}: FullScreenMapModalProps) {
  const dict = getDictionary().admin.map;
  const customersDict = getDictionary().admin.customers;

  const [waypointMode, setWaypointMode] = useState<WaypointMode>(null);

  // Resetuj tryb przy zamknięciu modala
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- modal cleanup pattern
    if (!open) setWaypointMode(null);
  }, [open]);

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

  const handleMapAddWaypoint = useCallback(
    (lat: number, lng: number) => {
      onAddRouteWaypoint?.(lat, lng);
      // Po dodaniu punktu wyjdź z trybu
      setWaypointMode(null);
    },
    [onAddRouteWaypoint],
  );

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
            style={{ top: `calc(${SAFE_TOP} + 60px)` }}
          >
            <Navigation className="h-4 w-4" />
            <span>{dict.navigateTo}</span>
            <ExternalLink className="h-3.5 w-3.5 text-emerald-200" />
          </button>
        )}

        {/* Przyciski zarządzania punktami pośrednimi */}
        <WaypointControls
          waypointMode={waypointMode}
          onModeChange={setWaypointMode}
          hasDestination={Boolean(destination)}
          waypointCount={plannedRouteWaypoints.length}
          onNavigate={
            destination
              ? () => openGoogleNavigation(destination, currentLocation, plannedRouteWaypoints)
              : undefined
          }
        />

        <MapContainer
          center={[currentLocation.lat, currentLocation.lng]}
          zoom={14}
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
          <MapInitialView center={[currentLocation.lat, currentLocation.lng]} zoom={14} />

          <RouteWaypointClickLayer mode={waypointMode} onAdd={handleMapAddWaypoint} />

          <TraveledPathLayers path={pathTraveled} />

          <RouteWaypointMarkers
            waypoints={plannedRouteWaypoints}
            editable={Boolean(editableRoute && onPlannedRouteWaypointsChange)}
            onWaypointsChange={onPlannedRouteWaypointsChange ?? (() => {})}
            deleteLabel={customersDict.routeDeleteWaypoint}
            waypointMode={waypointMode}
            onModeChange={setWaypointMode}
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
