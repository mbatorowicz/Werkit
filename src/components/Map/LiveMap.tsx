"use client";

import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { getDictionary } from "@/i18n";
import Image from "next/image";
import type { Coord, TimelineItem } from "@/types/worker";
import { buildSpeedColoredSegments, pathHasTimestampsForSpeed } from "@/lib/speedColoredPath";
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

interface LiveMapProps {
  currentLocation: { lat: number; lng: number; heading?: number | null };
  pathTraveled: Coord[];
  destination: { lat: number; lng: number } | null;
  onRouteDistance?: (distanceKm: number) => void;
  events?: TimelineItem[];
  onEventClick?: (id: string) => void;
  /**
   * Widok mobilny w aktywnej sesji: centruj na bieżącej pozycji (bez fitBounds po całej trasie).
   * Obrót mapPane jest wyłączony — kierunek na znaczniku (patrz igła azymutu).
   */
  preferPivotNavigation?: boolean;
}

export default function LiveMap({
  currentLocation,
  pathTraveled,
  destination,
  onRouteDistance,
  events = [],
  onEventClick,
  preferPivotNavigation = false,
}: LiveMapProps) {
  const [routeToDest, setRouteToDest] = useState<[number, number][]>([]);
  const [showHeadingNeedle, setShowHeadingNeedle] = useState(true);
  /** Po przeciągnięciu / zoomie gestem nie walczymy z GPS-em o środek mapy. */
  const [cameraFollowGps, setCameraFollowGps] = useState(true);
  const dict = getDictionary().admin.map;

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
    setCameraFollowGps(true);
  }, [preferPivotNavigation]);

  const currentMarkerIcon = useMemo(
    () =>
      createCurrentLocationIcon({
        showHeadingNeedle: showNeedleOnMarker,
        heading: currentLocation.heading,
      }),
    [showNeedleOnMarker, currentLocation.heading],
  );

  const showSpeedColors = pathHasTimestampsForSpeed(pathTraveled);
  const speedSegments = useMemo(() => buildSpeedColoredSegments(pathTraveled), [pathTraveled]);

  useEffect(() => {
    if (currentLocation && destination) {
      const fetchRoute = async () => {
        try {
          const url = `https://router.project-osrm.org/route/v1/driving/${currentLocation.lng},${currentLocation.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;
          const res = await fetch(url);
          const data: unknown = await res.json();
          const routes = (data as { routes?: { geometry: { coordinates: [number, number][] }; distance: number }[] })
            .routes;
          if (Array.isArray(routes) && routes.length > 0) {
            const route = routes[0];
            const coordinates = route.geometry.coordinates.map(
              (coord: [number, number]) => [coord[1], coord[0]] as [number, number],
            );
            setRouteToDest(coordinates);

            if (onRouteDistance) {
              onRouteDistance(route.distance / 1000);
            }
          }
        } catch {
          /* OSRM — brak trasy nie powinien blokować mapy */
        }
      };
      void fetchRoute();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- śledzimy wyłącznie współrzędne
  }, [currentLocation.lat, currentLocation.lng, destination?.lat, destination?.lng]);

  const showResumeFollow =
    !cameraFollowGps && (navPivotMode || followPanMode);

  return (
    <div className="w-full h-full rounded-lg overflow-hidden border border-zinc-800 relative">
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
        scrollWheelZoom
        doubleClickZoom
        dragging
        touchZoom
        boxZoom={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution="&copy; OpenStreetMap contributors"
        />

        <MapInvalidateOnResize />
        <UserTakeoverOnMapGesture onTakeover={() => setCameraFollowGps(false)} />

        {pathTraveled.length >= 2 ? (
          showSpeedColors ? (
            speedSegments.map((s, idx) => (
              <Polyline key={`traveled-spd-${idx}`} positions={s.positions} color={s.color} weight={5} opacity={0.85} />
            ))
          ) : (
            <Polyline
              positions={pathTraveled.map((p) => [p.lat, p.lng])}
              color="#3b82f6"
              weight={5}
              opacity={0.7}
            />
          )
        ) : null}

        {showSpeedColors && pathTraveled.length >= 2 ? (
          <div className="pointer-events-none absolute bottom-14 left-1/2 z-[999] flex -translate-x-1/2 flex-col items-center gap-1 rounded-lg border border-zinc-200/80 bg-white/95 px-2.5 py-1.5 text-[10px] text-zinc-600 shadow-md dark:border-zinc-600 dark:bg-zinc-900/95 dark:text-zinc-300">
            <span className="font-semibold uppercase tracking-wide">{dict.speedLegendTitle}</span>
            <div className="flex w-40 items-center gap-1">
              <span className="shrink-0 text-zinc-400">{dict.speedLegendSlow}</span>
              <div
                className="h-2 flex-1 rounded-full"
                style={{
                  background: "linear-gradient(90deg,#64748b,#047857,#10b981,#eab308,#ea580c)",
                }}
              />
              <span className="shrink-0 text-zinc-400">{dict.speedLegendFast}</span>
            </div>
          </div>
        ) : null}

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
  );
}
