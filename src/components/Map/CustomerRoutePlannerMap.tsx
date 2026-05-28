"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, Polyline, useMap } from "react-leaflet";
import { WerkitTileLayer } from "@/components/Map/WerkitTileLayer";
import { RouteWaypointMarkers } from "@/components/Map/RouteWaypointMarkers";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { RouteLngLat } from "@/lib/map/routeGeometryProvider";
import { useOsrmRouteToDestination } from "@/components/Map/useOsrmRouteToDestination";
import { getDictionary } from "@/i18n";
import {
  RouteWaypointClickLayer,
  WaypointControls,
  openGoogleNavigation,
  type WaypointMode,
} from "./mapSharedComponents";

const iconDest = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const iconStart = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function MapFlyTo({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, map.getZoom() < 12 ? 13 : map.getZoom(), { duration: 0.5 });
  }, [center, map]);
  return null;
}

// ---------------------------------------------------------------------------
// Główny komponent
// ---------------------------------------------------------------------------
export function CustomerRoutePlannerMap({
  routeOrigin,
  destination,
  waypoints,
  onWaypointsChange,
  onDestinationChange,
  editable = true,
  heightClass = "h-[320px]",
}: {
  /** Punkt startu trasy (baza firmy). */
  routeOrigin: RouteLngLat;
  destination: RouteLngLat | null;
  waypoints: RouteLngLat[];
  onWaypointsChange: (next: RouteLngLat[]) => void;
  /** Przeciąganie / pierwsze kliknięcie ustawia cel lokalizacji. */
  onDestinationChange?: (lat: number, lng: number) => void;
  editable?: boolean;
  heightClass?: string;
}) {
  const dict = getDictionary().admin.customers;
  const hasDestination = destination !== null;

  const [waypointMode, setWaypointMode] = useState<WaypointMode>(null);

  const routeLine = useOsrmRouteToDestination(routeOrigin, destination, undefined, undefined, waypoints, 8_000);

  const center = useMemo((): [number, number] => {
    if (destination) return [destination.lat, destination.lng];
    return [routeOrigin.lat, routeOrigin.lng];
  }, [destination, routeOrigin.lat, routeOrigin.lng]);

  const centerSig = `${center[0].toFixed(5)},${center[1].toFixed(5)}`;

  const _onSetDestination = useCallback(
    (lat: number, lng: number) => {
      onDestinationChange?.(lat, lng);
    },
    [onDestinationChange],
  );

  const onAddWaypoint = useCallback(
    (lat: number, lng: number) => {
      onWaypointsChange([...waypoints, { lat, lng }]);
      setWaypointMode(null);
    },
    [onWaypointsChange, waypoints],
  );

  const canEditDestination = editable && Boolean(onDestinationChange);
  const canEditWaypoints = editable && hasDestination;

  const handleNavigate = useCallback(() => {
    if (!destination) return;
    openGoogleNavigation(destination, routeOrigin, waypoints);
  }, [destination, routeOrigin, waypoints]);

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug">
        {hasDestination ? dict.routePlannerHint : dict.routePlannerSetDestinationHint}
      </p>
      <div
        className={`w-full ${heightClass} rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 relative z-0`}
      >
        <MapContainer center={center} zoom={13} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
          <WerkitTileLayer />
          <MapFlyTo center={center} key={centerSig} />

          {/* Przyciski + / - / nawiguj */}
          <WaypointControls
            waypointMode={waypointMode}
            onModeChange={setWaypointMode}
            hasDestination={hasDestination}
            waypointCount={waypoints.length}
            onNavigate={handleNavigate}
            compact
          />

          {/* Klik na mapę — tylko w trybie "add" dodaje punkt */}
          <RouteWaypointClickLayer mode={waypointMode} onAdd={onAddWaypoint} />

          <Marker position={[routeOrigin.lat, routeOrigin.lng]} icon={iconStart} />
          {destination ? (
            <Marker
              position={[destination.lat, destination.lng]}
              icon={iconDest}
              draggable={canEditDestination}
              eventHandlers={{
                dragend: (e) => {
                  const p = e.target.getLatLng();
                  onDestinationChange?.(p.lat, p.lng);
                },
              }}
            />
          ) : null}
          <RouteWaypointMarkers
            waypoints={waypoints}
            editable={canEditWaypoints}
            onWaypointsChange={onWaypointsChange}
            deleteLabel={dict.routeDeleteWaypoint}
            removeMode={waypointMode === "remove"}
            onRemoveModeExit={() => setWaypointMode(null)}
          />
          {routeLine.length > 0 ? (
            <Polyline positions={routeLine} color="#ef4444" weight={4} opacity={0.85} />
          ) : null}
        </MapContainer>
      </div>
    </div>
  );
}
