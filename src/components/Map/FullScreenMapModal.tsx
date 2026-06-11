"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, Popup, Polyline } from "react-leaflet";
import { WerkitTileLayer } from "@/components/Map/WerkitTileLayer";
import { RouteWaypointMarkers } from "@/components/Map/RouteWaypointMarkers";
import "leaflet/dist/leaflet.css";
import { useDictionary } from "@/i18n";
import type { Coord, TimelineItem } from "@/types/worker";
import {
  MapInvalidateOnResize,
  MapInitialView,
  LocateMeButton,
  RouteWaypointClickLayer,
  WaypointControls,
  type WaypointMode,
} from "./mapSharedComponents";
import { FullScreenMapOverlayButtons } from "./FullScreenMapOverlayButtons";
import { createCurrentLocationIcon, iconDest, iconStart } from "./liveMapIcons";
import { FullScreenMapEventMarkers } from "./FullScreenMapEventMarkers";
import { TraveledPathLayers } from "./TraveledPathLayers";
import { useOsrmRouteToDestination } from "./useOsrmRouteToDestination";

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
  const dictionary = useDictionary();
  const dict = dictionary.admin.map;
  const customersDict = dictionary.admin.customers;

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
    plannedRouteWaypoints
  );

  const currentMarkerIcon = useMemo(
    () =>
      createCurrentLocationIcon({
        showHeadingNeedle: false,
        heading: currentLocation.heading,
      }),
    [currentLocation.heading]
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
    [onAddRouteWaypoint]
  );

  if (!open) return null;

  return (
    <div
      className="fixed z-[9999] flex flex-col bg-black"
      style={{
        top: "var(--app-top-bar-height, 0px)",
        bottom: "var(--app-bottom-bar-height, 0px)",
        left: 0,
        right: 0,
      }}
    >
      {/* Mapa na pełnym ekranie — zajmuje całe dostępne miejsce */}
      <div className="flex-1 w-full relative">
        <FullScreenMapOverlayButtons
          onClose={onClose}
          closeLabel={dict.closeFullscreen}
          navigateLabel={dict.navigateTo}
          currentLocation={currentLocation}
          destination={destination}
          plannedRouteWaypoints={plannedRouteWaypoints}
        />

        {/* Przyciski zarządzania punktami pośrednimi (+ / -) — bez duplikatu nawigacji,
            bo osobny zielony przycisk "Nawiguj" jest po prawej stronie */}
        <WaypointControls
          waypointMode={waypointMode}
          onModeChange={setWaypointMode}
          hasDestination={Boolean(destination)}
          waypointCount={plannedRouteWaypoints.length}
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
            removeMode={waypointMode === "remove"}
            onRemoveModeExit={() => setWaypointMode(null)}
          />

          {pathTraveled.length > 0 ? (
            <Marker position={[pathTraveled[0].lat, pathTraveled[0].lng]} icon={iconStart}>
              <Popup>{dict.startPoint}</Popup>
            </Marker>
          ) : null}

          {/* Trasa — przerywana czerwona linia (podgląd) */}
          {routeToDest.length > 0 ? (
            <Polyline
              positions={routeToDest}
              color="#ef4444"
              weight={4}
              dashArray="5, 10"
              opacity={0.8}
            />
          ) : null}

          <FullScreenMapEventMarkers
            events={events}
            photoLabel={dict.eventPhoto}
            noteLabel={dict.eventNote}
            onEventClick={onEventClick}
          />

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
