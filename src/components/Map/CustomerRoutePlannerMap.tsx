"use client";

import { useCallback, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Polyline, CircleMarker, useMapEvents } from "react-leaflet";
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

function MapClickAddWaypoint({
  editable,
  onAdd,
}: {
  editable: boolean;
  onAdd: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      if (!editable) return;
      onAdd(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export function CustomerRoutePlannerMap({
  routeOrigin,
  destination,
  waypoints,
  onWaypointsChange,
  editable = true,
  heightClass = "h-[320px]",
}: {
  /** Punkt startu trasy (baza firmy lub pozycja GPS). */
  routeOrigin: RouteLngLat;
  destination: RouteLngLat;
  waypoints: RouteLngLat[];
  onWaypointsChange: (next: RouteLngLat[]) => void;
  editable?: boolean;
  heightClass?: string;
}) {
  const dict = getDictionary().admin.customers;

  const routeLine = usePlannedDrivingRoute(routeOrigin, destination, waypoints);

  const center = useMemo((): [number, number] => {
    return [destination.lat, destination.lng];
  }, [destination.lat, destination.lng]);

  const onAdd = useCallback(
    (lat: number, lng: number) => {
      onWaypointsChange([...waypoints, { lat, lng }]);
    },
    [onWaypointsChange, waypoints],
  );

  const onRemoveLast = () => {
    if (waypoints.length === 0) return;
    onWaypointsChange(waypoints.slice(0, -1));
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 flex-1 min-w-[200px]">{dict.routePlannerHint}</p>
        {editable ? (
          <button
            type="button"
            onClick={onRemoveLast}
            disabled={waypoints.length === 0}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-600 disabled:opacity-40"
          >
            {dict.routeUndoWaypoint}
          </button>
        ) : null}
      </div>
      <div className={`w-full ${heightClass} rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 relative z-0`}>
        <MapContainer center={center} zoom={13} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
          <MapClickAddWaypoint editable={editable} onAdd={onAdd} />
          <Marker position={[routeOrigin.lat, routeOrigin.lng]} icon={iconStart} />
          <Marker position={[destination.lat, destination.lng]} icon={iconDest} />
          {waypoints.map((wp, i) => (
            <CircleMarker
              key={`${wp.lat}-${wp.lng}-${i}`}
              center={[wp.lat, wp.lng]}
              radius={7}
              pathOptions={{ color: "#f59e0b", fillColor: "#fbbf24", fillOpacity: 0.9, weight: 2 }}
            />
          ))}
          {routeLine.length > 0 ? (
            <Polyline positions={routeLine} color="#ef4444" weight={4} opacity={0.85} />
          ) : null}
        </MapContainer>
      </div>
    </div>
  );
}
