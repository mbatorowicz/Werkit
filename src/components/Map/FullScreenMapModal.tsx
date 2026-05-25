"use client";

import { useEffect, useMemo, useRef } from "react";
import { MapContainer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import { WerkitTileLayer } from "@/components/Map/WerkitTileLayer";
import { RouteWaypointMarkers } from "@/components/Map/RouteWaypointMarkers";
import "leaflet/dist/leaflet.css";
import { getDictionary } from "@/i18n";
import type { Coord, TimelineItem } from "@/types/worker";
import {
  FitContentDebounced,
  FollowPan,
  FollowPivotCenter,
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
import { X, Navigation, ExternalLink } from "lucide-react";

// ---------------------------------------------------------------------------
// Helper: otwiera nawigację zewnętrzną (Google Maps / Waze / Apple Maps)
// ---------------------------------------------------------------------------
function openNavigation(
  app: "google" | "waze" | "apple",
  dest: { lat: number; lng: number },
  origin?: { lat: number; lng: number } | null,
) {
  const d = `${dest.lat},${dest.lng}`;
  const o = origin ? `${origin.lat},${origin.lng}` : undefined;

  switch (app) {
    case "google": {
      const url = o
        ? `https://www.google.com/maps/dir/?api=1&origin=${o}&destination=${d}&travelmode=driving`
        : `https://www.google.com/maps/dir/?api=1&destination=${d}&travelmode=driving`;
      window.open(url, "_blank", "noopener,noreferrer");
      break;
    }
    case "waze": {
      const url = o
        ? `https://www.waze.com/ul?ll=${d}&navigate=yes&from=${o}`
        : `https://www.waze.com/ul?ll=${d}&navigate=yes`;
      window.open(url, "_blank", "noopener,noreferrer");
      break;
    }
    case "apple": {
      const url = o
        ? `https://maps.apple.com/?daddr=${d}&saddr=${o}&dirflg=d`
        : `https://maps.apple.com/?daddr=${d}&dirflg=d`;
      window.open(url, "_blank", "noopener,noreferrer");
      break;
    }
  }
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
  }, [center[0], center[1], zoom, map]);

  return null;
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

  const fitContentMode = Boolean(
    destination ||
      pathTraveled.length > 0 ||
      events.length > 0 ||
      routeToDest.length > 0,
  );
  const followPanMode = !fitContentMode;

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
      {/* Pasek narzędzi */}
      <div className="flex items-center justify-between bg-zinc-900 px-4 py-3 text-white shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-2 rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium transition hover:bg-zinc-700 active:scale-95"
        >
          <X className="h-4 w-4" />
          {dict.closeFullscreen}
        </button>

        <div className="flex items-center gap-2">
          {destination ? (
            <>
              <span className="hidden sm:inline text-sm text-zinc-400 mr-1">
                {dict.navigateTo}:
              </span>
              <button
                type="button"
                onClick={() => openNavigation("google", destination, currentLocation)}
                className="flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-2 text-xs font-medium transition hover:bg-zinc-700 active:scale-95"
                title={dict.navigateGoogleMaps}
              >
                <Navigation className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{dict.navigateGoogleMaps}</span>
                <ExternalLink className="h-3 w-3 text-zinc-500" />
              </button>
              <button
                type="button"
                onClick={() => openNavigation("waze", destination, currentLocation)}
                className="flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-2 text-xs font-medium transition hover:bg-zinc-700 active:scale-95"
                title={dict.navigateWaze}
              >
                <span className="font-bold text-blue-400">W</span>
                <span className="hidden sm:inline">{dict.navigateWaze}</span>
                <ExternalLink className="h-3 w-3 text-zinc-500" />
              </button>
              <button
                type="button"
                onClick={() => openNavigation("apple", destination, currentLocation)}
                className="flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-2 text-xs font-medium transition hover:bg-zinc-700 active:scale-95"
                title={dict.navigateAppleMaps}
              >
                <span className="font-bold text-zinc-300"></span>
                <span className="hidden sm:inline">{dict.navigateAppleMaps}</span>
                <ExternalLink className="h-3 w-3 text-zinc-500" />
              </button>
            </>
          ) : null}
        </div>
      </div>

      {/* Mapa na pełnym ekranie */}
      <div className="flex-1 w-full relative">
        <MapContainer
          center={center}
          zoom={zoom}
          style={{ height: "100%", width: "100%" }}
          zoomControl
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

          <TraveledPathLayers path={pathTraveled} />

          <RouteWaypointMarkers
            waypoints={plannedRouteWaypoints}
            editable={false}
            onWaypointsChange={() => {}}
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
          <FollowPan
            lat={currentLocation.lat}
            lng={currentLocation.lng}
            active={followPanMode}
            followEnabled={false}
          />
        </MapContainer>
      </div>
    </div>
  );
}
