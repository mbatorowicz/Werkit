"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MapContainer } from "react-leaflet";
import { WerkitTileLayer } from "@/components/Map/WerkitTileLayer";
import { RouteWaypointMarkers } from "@/components/Map/RouteWaypointMarkers";
import "leaflet/dist/leaflet.css";
import { useDictionary } from "@/i18n";
import type { Coord, TimelineItem } from "@/types/worker";
import {
  MapInvalidateOnResize,
  RouteWaypointClickLayer,
  UserTakeoverOnMapGesture,
  type WaypointMode,
} from "./mapSharedComponents";
import { createCurrentLocationIcon } from "./liveMapIcons";
import { TraveledPathLayers } from "./TraveledPathLayers";
import { useOsrmRouteToDestination } from "./useOsrmRouteToDestination";
import FullScreenMapModal from "./FullScreenMapModal";
import { MapControls } from "./MapControls";
import { LiveMapMarkers } from "./LiveMapMarkers";
import { LiveMapFollowBehaviors } from "./LiveMapFollowBehaviors";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface LiveMapProps {
  currentLocation: { lat: number; lng: number; heading?: number | null };
  pathTraveled: Coord[];
  destination: { lat: number; lng: number } | null;
  /** Punkty pośrednie zaplanowanej trasy (z bazy — customer_locations.route_waypoints). */
  plannedRouteWaypoints?: { lat: number; lng: number }[];
  onRouteDistance?: (distanceKm: number) => void;
  events?: TimelineItem[];
  onEventClick?: (id: string) => void;
  /**
   * Widok mobilny w aktywnej sesji: centruj na bieżącej pozycji (bez fitBounds po całej trasie).
   * Obrót mapPane jest wyłączony — kierunek na znaczniku (patrz igła azymutu).
   */
  preferPivotNavigation?: boolean;
  /** Klik na mapę dodaje punkt pośredni (wymaga `onAddRouteWaypoint`). */
  editableRoute?: boolean;
  onAddRouteWaypoint?: (lat: number, lng: number) => void;
  /** Pełna edycja punktów pośrednich (przeciąganie, usuwanie dowolnego). */
  onPlannedRouteWaypointsChange?: (next: { lat: number; lng: number }[]) => void;
  /**
   * Tryb miniaturki: brak przeciągania, brak zoomu scroll/touch, brak dodawania punktów.
   * Mapa jest wyśrodkowana i nieruchoma — używane w widoku sesji (główna mapa),
   * podczas gdy pełny ekran (modal) ma pełną interakcję.
   */
  thumbnail?: boolean;
  /** Nazwa celu (np. adres klienta) do wyświetlenia w nawigacji. */
  destinationName?: string;
}

// ---------------------------------------------------------------------------
// Tryby widoku — czysta logika wyliczana z propsów i stanu
// ---------------------------------------------------------------------------
function computeLiveMapModes(input: {
  thumbnail: boolean;
  preferPivotNavigation: boolean;
  heading: number | null | undefined;
  showHeadingNeedle: boolean;
  hasDestination: boolean;
  hasPath: boolean;
  hasEvents: boolean;
  hasRoute: boolean;
}) {
  const headingKnown = input.heading !== undefined && input.heading !== null;
  const navPivotMode = Boolean(input.preferPivotNavigation);
  // W trybie thumbnail nie pokazujemy igły azymutu na znaczniku — mapa ma być czysta
  const showNeedleOnMarker = Boolean(
    !input.thumbnail && navPivotMode && input.showHeadingNeedle && headingKnown
  );

  // W trybie thumbnail (miniatura) zawsze pokazujemy całą trasę — fitContent wymuszony.
  // W trybie nawigacji (preferPivotNavigation) bez thumbnail śledzimy pozycję.
  const hasRouteContent = Boolean(
    input.hasDestination || input.hasPath || input.hasEvents || input.hasRoute
  );
  const fitContentMode = input.thumbnail ? hasRouteContent : !navPivotMode && hasRouteContent;

  const followPanMode = !input.thumbnail && !navPivotMode && !fitContentMode;

  return { headingKnown, navPivotMode, showNeedleOnMarker, fitContentMode, followPanMode };
}

// ---------------------------------------------------------------------------
// Komponent
// ---------------------------------------------------------------------------
export default function LiveMap({
  currentLocation,
  pathTraveled,
  destination,
  plannedRouteWaypoints = [],
  onRouteDistance,
  events = [],
  onEventClick,
  preferPivotNavigation = false,
  editableRoute = false,
  onAddRouteWaypoint,
  onPlannedRouteWaypointsChange,
  thumbnail = false,
  destinationName,
}: LiveMapProps) {
  const routeToDest = useOsrmRouteToDestination(
    currentLocation,
    destination,
    onRouteDistance,
    undefined,
    plannedRouteWaypoints
  );

  const [showHeadingNeedle, setShowHeadingNeedle] = useState(true);
  const [cameraFollowGps, setCameraFollowGps] = useState(true);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [waypointMode, setWaypointMode] = useState<WaypointMode>(null);
  const dictionary = useDictionary();
  const dict = dictionary.admin.map;
  const customersDict = dictionary.admin.customers;
  const canEditWaypoints = Boolean(editableRoute && onPlannedRouteWaypointsChange);

  const handleMapAddWaypoint = useCallback(
    (lat: number, lng: number) => {
      onAddRouteWaypoint?.(lat, lng);
      setWaypointMode(null);
    },
    [onAddRouteWaypoint]
  );

  const { headingKnown, navPivotMode, showNeedleOnMarker, fitContentMode, followPanMode } =
    computeLiveMapModes({
      thumbnail,
      preferPivotNavigation,
      heading: currentLocation.heading,
      showHeadingNeedle,
      hasDestination: Boolean(destination),
      hasPath: pathTraveled.length > 0,
      hasEvents: events.length > 0,
      hasRoute: routeToDest.length > 0,
    });

  useEffect(() => {
    queueMicrotask(() => {
      setCameraFollowGps(true);
    });
  }, [preferPivotNavigation]);

  const currentMarkerIcon = useMemo(
    () =>
      createCurrentLocationIcon({
        showHeadingNeedle: showNeedleOnMarker,
        heading: currentLocation.heading,
      }),
    [showNeedleOnMarker, currentLocation.heading]
  );

  const showResumeFollow = !cameraFollowGps && (navPivotMode || followPanMode);

  return (
    <>
      <div className="w-full h-full rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 relative group">
        <MapControls
          thumbnail={thumbnail}
          headingKnown={headingKnown}
          showHeadingNeedle={showHeadingNeedle}
          showResumeFollow={showResumeFollow}
          onToggleFullscreen={() => setFullscreenOpen(true)}
          onToggleHeadingNeedle={() => setShowHeadingNeedle(!showHeadingNeedle)}
          onResumeFollow={() => setCameraFollowGps(true)}
          dict={dict}
        />

        <MapContainer
          center={[currentLocation.lat, currentLocation.lng]}
          zoom={14}
          style={{ height: "100%", width: "100%" }}
          zoomControl={false}
          scrollWheelZoom={!thumbnail}
          doubleClickZoom={!thumbnail}
          dragging={!thumbnail}
          touchZoom={!thumbnail}
          boxZoom={false}
          keyboard={!thumbnail}
        >
          <WerkitTileLayer />

          <MapInvalidateOnResize />
          {!thumbnail && <UserTakeoverOnMapGesture onTakeover={() => setCameraFollowGps(false)} />}
          {!thumbnail && (
            <RouteWaypointClickLayer mode={waypointMode} onAdd={handleMapAddWaypoint} />
          )}

          <TraveledPathLayers path={pathTraveled} />

          {/* W trybie thumbnail punkty pośrednie są statyczne — brak przeciągania i usuwania */}
          <RouteWaypointMarkers
            waypoints={plannedRouteWaypoints}
            editable={!thumbnail && canEditWaypoints}
            onWaypointsChange={onPlannedRouteWaypointsChange ?? (() => {})}
            deleteLabel={customersDict.routeDeleteWaypoint}
          />

          <LiveMapMarkers
            thumbnail={thumbnail}
            pathTraveled={pathTraveled}
            routeToDest={routeToDest}
            events={events}
            onEventClick={onEventClick}
            destination={destination}
            currentLocation={currentLocation}
            currentMarkerIcon={currentMarkerIcon}
            dict={dict}
          />

          <LiveMapFollowBehaviors
            thumbnail={thumbnail}
            fitContentMode={fitContentMode}
            navPivotMode={navPivotMode}
            followPanMode={followPanMode}
            cameraFollowGps={cameraFollowGps}
            currentLocation={currentLocation}
            pathTraveled={pathTraveled}
            destination={destination}
            routeToDest={routeToDest}
            events={events}
          />
        </MapContainer>
      </div>

      <FullScreenMapModal
        open={fullscreenOpen}
        onClose={() => setFullscreenOpen(false)}
        currentLocation={currentLocation}
        pathTraveled={pathTraveled}
        destination={destination}
        plannedRouteWaypoints={plannedRouteWaypoints}
        events={events}
        onEventClick={onEventClick}
        editableRoute={editableRoute}
        onAddRouteWaypoint={onAddRouteWaypoint}
        onPlannedRouteWaypointsChange={onPlannedRouteWaypointsChange}
        destinationName={destinationName}
      />
    </>
  );
}
