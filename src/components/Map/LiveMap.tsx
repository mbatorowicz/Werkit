"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, Marker, Popup, Polyline, useMap, useMapEvents } from "react-leaflet";
import { WerkitTileLayer } from "@/components/Map/WerkitTileLayer";
import { RouteWaypointMarkers } from "@/components/Map/RouteWaypointMarkers";
import "leaflet/dist/leaflet.css";
import { getDictionary } from "@/i18n";
import Image from "next/image";
import type { Coord, TimelineItem } from "@/types/worker";
import {
  FitContentDebounced,
  FollowPan,
  FollowPivotCenter,
  MapInvalidateOnResize,
  UserTakeoverOnMapGesture,
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
import FullScreenMapModal from "./FullScreenMapModal";
import { Maximize2 } from "lucide-react";

// ---------------------------------------------------------------------------
// Sub-komponent: śledzi bieżący stan mapy (center, zoom) dla pełnoekranowego modala
// ---------------------------------------------------------------------------
function MapStateReporter({
  onStateChange,
}: {
  onStateChange: (center: [number, number], zoom: number) => void;
}) {
  const map = useMap();
  const report = useCallback(() => {
    const c = map.getCenter();
    onStateChange([c.lat, c.lng], map.getZoom());
  }, [map, onStateChange]);

  useEffect(() => {
    // Initial report
    report();
    map.on("moveend zoomend", report);
    return () => {
      map.off("moveend zoomend", report);
    };
  }, [map, report]);

  return null;
}

// ---------------------------------------------------------------------------
// Sub-komponent: klik na mapę dodaje punkt pośredni
// ---------------------------------------------------------------------------
function RouteWaypointClickLayer({
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
}: LiveMapProps) {
  const routeToDest = useOsrmRouteToDestination(
    currentLocation,
    destination,
    onRouteDistance,
    undefined,
    plannedRouteWaypoints,
  );
  const [showHeadingNeedle, setShowHeadingNeedle] = useState(true);
  const [cameraFollowGps, setCameraFollowGps] = useState(true);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([currentLocation.lat, currentLocation.lng]);
  const [mapZoom, setMapZoom] = useState(14);
  const dict = getDictionary().admin.map;
  const customersDict = getDictionary().admin.customers;
  const canEditWaypoints = Boolean(editableRoute && onPlannedRouteWaypointsChange);

  const headingKnown = currentLocation.heading !== undefined && currentLocation.heading !== null;
  const navPivotMode = Boolean(preferPivotNavigation);
  const showNeedleOnMarker = Boolean(navPivotMode && showHeadingNeedle && headingKnown);

  const fitContentMode =
    !navPivotMode &&
    Boolean(
      destination ||
        pathTraveled.length > 0 ||
        events.length > 0 ||
        routeToDest.length > 0,
    );

  const followPanMode = !navPivotMode && !fitContentMode;

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
    [showNeedleOnMarker, currentLocation.heading],
  );

  const showResumeFollow = !cameraFollowGps && (navPivotMode || followPanMode);

  const handleMapStateChange = useCallback((center: [number, number], zoom: number) => {
    setMapCenter(center);
    setMapZoom(zoom);
  }, []);

  return (
    <>
      <div className="w-full h-full rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 relative group">
        {/* Przycisk pełnego ekranu — zawsze widoczny */}
        <button
          type="button"
          onClick={() => setFullscreenOpen(true)}
          className="absolute top-3 right-3 z-[1000] bg-white/90 dark:bg-zinc-800/90 text-zinc-700 dark:text-zinc-300 px-3 py-1.5 rounded-full shadow-lg text-xs font-medium border border-zinc-200 dark:border-zinc-700 transition hover:bg-white dark:hover:bg-zinc-700 active:scale-95 flex items-center gap-1.5 backdrop-blur-sm"
        >
          <Maximize2 className="h-3.5 w-3.5" />
          {dict.fullscreen}
        </button>

        {headingKnown ? (
          <button
            type="button"
            onClick={() => setShowHeadingNeedle(!showHeadingNeedle)}
            className="absolute bottom-6 right-4 z-[1000] bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white px-4 py-2 rounded-full shadow-lg font-medium text-xs border border-zinc-200 dark:border-zinc-700 transition active:scale-95"
          >
            {showHeadingNeedle ? dict.headingOn : dict.headingOff}
          </button>
        ) : null}

        {showResumeFollow ? (
          <button
            type="button"
            onClick={() => setCameraFollowGps(true)}
            className="absolute bottom-6 left-4 z-[1000] bg-emerald-600 text-white px-4 py-2 rounded-full shadow-lg font-medium text-xs border border-emerald-500 transition active:scale-95 hover:bg-emerald-500"
          >
            {dict.followResume}
          </button>
        ) : null}

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
        >
          <WerkitTileLayer />

          <MapInvalidateOnResize />
          <UserTakeoverOnMapGesture onTakeover={() => setCameraFollowGps(false)} />
          {!thumbnail && (
            <RouteWaypointClickLayer editable={editableRoute} onAdd={onAddRouteWaypoint} />
          )}
          <MapStateReporter onStateChange={handleMapStateChange} />

          <TraveledPathLayers path={pathTraveled} />

          <RouteWaypointMarkers
            waypoints={plannedRouteWaypoints}
            editable={canEditWaypoints}
            onWaypointsChange={onPlannedRouteWaypointsChange ?? (() => {})}
            deleteLabel={customersDict.routeDeleteWaypoint}
          />

          {pathTraveled.length > 0 ? (
            <Marker position={[pathTraveled[0].lat, pathTraveled[0].lng]} icon={iconStart}>
              <Popup>{dict.startPoint}</Popup>
            </Marker>
          ) : null}

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
                  {ev.type === "photo" ? (
                    <Image
                      src={ev.content}
                      alt="Zdarzenie"
                      width={250}
                      height={150}
                      unoptimized
                      className="w-full rounded-md object-cover max-h-[150px]"
                    />
                  ) : null}
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

          <FitContentDebounced
            enabled={fitContentMode}
            currentLocation={currentLocation}
            pathTraveled={pathTraveled}
            destination={destination}
            routeToDest={routeToDest}
            events={events}
          />
          <FollowPivotCenter
            lat={currentLocation.lat}
            lng={currentLocation.lng}
            active={navPivotMode}
            followEnabled={cameraFollowGps}
          />
          <FollowPan
            lat={currentLocation.lat}
            lng={currentLocation.lng}
            active={followPanMode}
            followEnabled={cameraFollowGps}
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
        center={mapCenter}
        zoom={mapZoom}
        editableRoute={editableRoute}
        onAddRouteWaypoint={onAddRouteWaypoint}
        onPlannedRouteWaypointsChange={onPlannedRouteWaypointsChange}
      />
    </>
  );
}
