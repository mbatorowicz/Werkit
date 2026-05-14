"use client";

import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
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
  const routeToDest = useOsrmRouteToDestination(currentLocation, destination, onRouteDistance);
  const [showHeadingNeedle, setShowHeadingNeedle] = useState(true);
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

  const speedLegend = useMemo(
    () => ({
      speedLegendTitle: dict.speedLegendTitle,
      speedLegendSlow: dict.speedLegendSlow,
      speedLegendFast: dict.speedLegendFast,
    }),
    [dict.speedLegendTitle, dict.speedLegendSlow, dict.speedLegendFast],
  );

  const showResumeFollow = !cameraFollowGps && (navPivotMode || followPanMode);

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

        <TraveledPathLayers path={pathTraveled} legend={speedLegend} />

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
