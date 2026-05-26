"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { useOsrmNavigation } from "./useOsrmNavigation";
import NavigationInstructionBar from "./NavigationInstructionBar";
import NavigationBottomSheet from "./NavigationBottomSheet";
import { isMapClickBlocked } from "@/lib/map/blockMapClickBriefly";
import { isLeafletUiClick } from "@/lib/map/isLeafletUiClick";
import {
  X,
  Navigation,
  ExternalLink,
  List,
  Navigation as NavIcon,
  ChevronDown,
  Plus,
  Minus,
  LocateFixed,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Safe area top offset — works on mobile with notches / status bars
// ---------------------------------------------------------------------------
const SAFE_TOP = "max(env(safe-area-inset-top, 0px), 8px)";
const SAFE_BOTTOM = "env(safe-area-inset-bottom, 0px)";

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
// Sub-komponent: niestandardowe kontrolki zoomu (zamiast Leaflet zoomControl)
// ---------------------------------------------------------------------------
function CustomZoomControls() {
  const map = useMap();

  const handleZoomIn = useCallback(() => {
    map.zoomIn();
  }, [map]);

  const handleZoomOut = useCallback(() => {
    map.zoomOut();
  }, [map]);

  return (
    <div
      className="absolute z-[1001] flex flex-col gap-0.5"
      style={{
        top: `calc(${SAFE_TOP} + 64px)`,
        left: "12px",
      }}
    >
      <button
        type="button"
        onClick={handleZoomIn}
        className="flex items-center justify-center w-10 h-10 rounded-t-xl bg-white/90 dark:bg-zinc-800/90 text-zinc-700 dark:text-zinc-200 shadow-lg border border-zinc-200 dark:border-zinc-700 transition hover:bg-white dark:hover:bg-zinc-700 active:scale-95 backdrop-blur-sm"
        aria-label="Zoom in"
      >
        <Plus className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={handleZoomOut}
        className="flex items-center justify-center w-10 h-10 rounded-b-xl bg-white/90 dark:bg-zinc-800/90 text-zinc-700 dark:text-zinc-200 shadow-lg border border-zinc-200 dark:border-zinc-700 border-t-0 transition hover:bg-white dark:hover:bg-zinc-700 active:scale-95 backdrop-blur-sm"
        aria-label="Zoom out"
      >
        <Minus className="h-5 w-5" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-komponent: przycisk "Moja lokalizacja" (centruje na bieżącej pozycji)
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
  const [showNavigationList, setShowNavigationList] = useState(false);
  // Nawigacja turn-by-turn aktywna od razu gdy jest destination (użytkownik sam steruje widokiem mapy)
  const [navigationActive, setNavigationActive] = useState(true);
  // Menu nawigacji zewnętrznej (Google/Waze/Apple) — na mobile chowane pod przycisk
  const [showExternalNavMenu, setShowExternalNavMenu] = useState(false);

  const routeToDest = useOsrmRouteToDestination(
    currentLocation,
    destination,
    undefined,
    undefined,
    plannedRouteWaypoints,
  );

  // Turn-by-turn navigation — aktywna od razu gdy destination istnieje
  const navigation = useOsrmNavigation(
    currentLocation,
    destination,
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

  // Resetuj nawigację przy zamknięciu
  useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset stanu przy zamknięciu modala, konieczne przed odmontowaniem
      setNavigationActive(false);
      setShowNavigationList(false);
      setShowExternalNavMenu(false);
    }
  }, [open]);

  // Zamknij menu zewnętrznej nawigacji po kliknięciu w mapę
  const handleCloseExternalNav = useCallback(() => {
    setShowExternalNavMenu(false);
  }, []);

  // Current and next instruction for the navigation bar
  const currentInstruction = navigation.instructions.length > 0 && navigation.currentInstructionIndex < navigation.instructions.length
    ? navigation.instructions[navigation.currentInstructionIndex]
    : null;
  const nextInstruction = navigation.instructions.length > 0 && navigation.currentInstructionIndex + 1 < navigation.instructions.length
    ? navigation.instructions[navigation.currentInstructionIndex + 1]
    : null;

  const showNavigationUI = Boolean(navigationActive && destination && navigation.instructions.length > 0);

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

        {/* Floating navigation controls — prawy górny róg, z safe-area */}
        {/* Umieszczone niżej niż close button, żeby nie kolidować z NavigationInstructionBar */}
        <div
          className="absolute right-4 z-[1001] flex items-center gap-2"
          style={{ top: `calc(${SAFE_TOP} + 56px)` }}
        >
          {destination && (
            <>
              {/* Przycisk przełączania nawigacji turn-by-turn */}
              <button
                type="button"
                onClick={() => setNavigationActive((prev) => !prev)}
                className={`flex items-center gap-1.5 rounded-full px-4 py-2.5 text-xs font-medium shadow-lg transition active:scale-95 ${
                  navigationActive
                    ? "bg-red-600/90 text-white hover:bg-red-500"
                    : "bg-emerald-600 text-white hover:bg-emerald-500"
                }`}
                title={navigationActive ? "Stop navigation" : dict.navigateTo}
              >
                <NavIcon className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {navigationActive ? "Stop" : dict.navigateTo}
                </span>
              </button>

              {/* Przycisk menu nawigacji zewnętrznej */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowExternalNavMenu((prev) => !prev)}
                  className="flex items-center gap-1.5 rounded-full bg-black/70 backdrop-blur-md px-3 py-2.5 text-xs font-medium text-white shadow-lg border border-white/15 transition hover:bg-black/90 active:scale-95"
                  title={dict.navigateExternal}
                >
                  <Navigation className="h-4 w-4" />
                  <ChevronDown className={`h-3 w-3 transition-transform ${showExternalNavMenu ? "rotate-180" : ""}`} />
                </button>

                {/* Rozwijane menu zewnętrznej nawigacji */}
                {showExternalNavMenu && (
                  <>
                    {/* Overlay do zamykania kliknięciem poza menu */}
                    <div className="fixed inset-0 z-0" onClick={handleCloseExternalNav} />
                    <div className="absolute right-0 top-full mt-2 z-10 w-44 rounded-xl bg-zinc-900/95 backdrop-blur-md shadow-2xl border border-white/10 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => { openNavigation("google", destination, currentLocation); setShowExternalNavMenu(false); }}
                        className="flex items-center gap-3 w-full px-4 py-3 text-xs font-medium text-white hover:bg-white/10 transition"
                      >
                        <Navigation className="h-3.5 w-3.5 text-blue-400" />
                        <span>{dict.navigateGoogleMaps}</span>
                        <ExternalLink className="h-3 w-3 text-zinc-500 ml-auto" />
                      </button>
                      <button
                        type="button"
                        onClick={() => { openNavigation("waze", destination, currentLocation); setShowExternalNavMenu(false); }}
                        className="flex items-center gap-3 w-full px-4 py-3 text-xs font-medium text-white hover:bg-white/10 transition"
                      >
                        <span className="font-bold text-blue-400 text-sm w-3.5 text-center">W</span>
                        <span>{dict.navigateWaze}</span>
                        <ExternalLink className="h-3 w-3 text-zinc-500 ml-auto" />
                      </button>
                      <button
                        type="button"
                        onClick={() => { openNavigation("apple", destination, currentLocation); setShowExternalNavMenu(false); }}
                        className="flex items-center gap-3 w-full px-4 py-3 text-xs font-medium text-white hover:bg-white/10 transition"
                      >
                        <span className="font-bold text-zinc-300 text-sm w-3.5 text-center"></span>
                        <span>{dict.navigateAppleMaps}</span>
                        <ExternalLink className="h-3 w-3 text-zinc-500 ml-auto" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {/* Navigation instruction bar — top of map in fullscreen (tylko gdy nawigacja aktywna) */}
        {showNavigationUI && (
          <NavigationInstructionBar
            currentInstruction={currentInstruction}
            nextInstruction={nextInstruction}
            remainingToNextInstruction={navigation.remainingToNextInstruction}
            remainingDistance={navigation.remainingDistance}
            remainingDuration={navigation.remainingDuration}
            loading={navigation.loading}
            error={navigation.error}
            destinationName={destinationName}
            onExpand={() => setShowNavigationList((prev) => !prev)}
          />
        )}

        {/* Floating "Open in Google Maps" — always visible when destination is set, acts as primary external nav */}
        {destination && (
          <button
            type="button"
            onClick={() => { openNavigation("google", destination, currentLocation); }}
            className="absolute left-4 z-[1001] flex items-center gap-2 rounded-full bg-blue-600/90 backdrop-blur-md px-5 py-3 text-sm font-semibold text-white shadow-lg border border-blue-500/30 transition hover:bg-blue-500 active:scale-95"
            style={{ bottom: `calc(${SAFE_BOTTOM} + 24px)` }}
          >
            <Navigation className="h-4 w-4" />
            <span>{dict.navigateGoogleMaps}</span>
            <ExternalLink className="h-3.5 w-3.5 text-blue-200" />
          </button>
        )}

        {/* Navigation list toggle — floating button nad mapą */}
        {showNavigationUI && !showNavigationList && (
          <button
            type="button"
            onClick={() => setShowNavigationList(true)}
            className="absolute z-[1001] bg-blue-600 text-white px-3 py-2 rounded-full shadow-lg text-xs font-medium border border-blue-500 transition active:scale-95 hover:bg-blue-500 flex items-center gap-1.5"
            style={{ bottom: `calc(${SAFE_BOTTOM} + 24px)`, right: "12px" }}
          >
            <List className="h-3.5 w-3.5" />
            {dict.navigationShowList || "List"}
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

          {/* Navigation route polyline (solid blue for active nav, dashed red for preview) */}
          {showNavigationUI && navigation.routeGeometry.length > 0 ? (
            <Polyline positions={navigation.routeGeometry} color="#3b82f6" weight={5} opacity={0.9} />
          ) : routeToDest.length > 0 ? (
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

          {/* Custom zoom controls (inside MapContainer for Leaflet context) */}
          <CustomZoomControls />

          {/* Locate me button (inside MapContainer for Leaflet context) */}
          <LocateMeButton currentLocation={currentLocation} />
        </MapContainer>

        {/* Navigation bottom sheet (instruction list) */}
        {showNavigationUI && showNavigationList && (
          <NavigationBottomSheet
            instructions={navigation.instructions}
            currentInstructionIndex={navigation.currentInstructionIndex}
            remainingDistance={navigation.remainingDistance}
            remainingDuration={navigation.remainingDuration}
            destinationName={destinationName}
            onClose={() => setShowNavigationList(false)}
          />
        )}
      </div>
    </div>
  );
}
