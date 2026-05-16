"use client";

import { useCallback, useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap, useMapEvents } from "react-leaflet";
import { RouteWaypointMarkers } from "@/components/Map/RouteWaypointMarkers";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { RouteLngLat } from "@/lib/map/routeGeometryProvider";
import { usePlannedDrivingRoute } from "@/components/Map/usePlannedDrivingRoute";
import { getDictionary } from "@/i18n";

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

function MapClickLayer({
  editable,
  hasDestination,
  onSetDestination,
  onAddWaypoint,
}: {
  editable: boolean;
  hasDestination: boolean;
  onSetDestination: (lat: number, lng: number) => void;
  onAddWaypoint: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      if (!editable) return;
      if (!hasDestination) {
        onSetDestination(e.latlng.lat, e.latlng.lng);
      } else {
        onAddWaypoint(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

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

  const routeLine = usePlannedDrivingRoute(routeOrigin, destination, waypoints);

  const center = useMemo((): [number, number] => {
    if (destination) return [destination.lat, destination.lng];
    return [routeOrigin.lat, routeOrigin.lng];
  }, [destination, routeOrigin.lat, routeOrigin.lng]);

  const centerSig = `${center[0].toFixed(5)},${center[1].toFixed(5)}`;

  const onSetDestination = useCallback(
    (lat: number, lng: number) => {
      onDestinationChange?.(lat, lng);
    },
    [onDestinationChange],
  );

  const onAddWaypoint = useCallback(
    (lat: number, lng: number) => {
      onWaypointsChange([...waypoints, { lat, lng }]);
    },
    [onWaypointsChange, waypoints],
  );

  const canEditDestination = editable && Boolean(onDestinationChange);
  const canEditWaypoints = editable && hasDestination;

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug">
        {hasDestination ? dict.routePlannerHint : dict.routePlannerSetDestinationHint}
      </p>
      <div
        className={`w-full ${heightClass} rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 relative z-0`}
      >
        <MapContainer center={center} zoom={13} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
          <MapFlyTo center={center} key={centerSig} />
          <MapClickLayer
            editable={canEditDestination}
            hasDestination={hasDestination}
            onSetDestination={onSetDestination}
            onAddWaypoint={onAddWaypoint}
          />
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
          />
          {routeLine.length > 0 ? (
            <Polyline positions={routeLine} color="#ef4444" weight={4} opacity={0.85} />
          ) : null}
        </MapContainer>
      </div>
    </div>
  );
}


