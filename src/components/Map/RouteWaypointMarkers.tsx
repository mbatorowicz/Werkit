"use client";

import { Marker, Popup } from "react-leaflet";
import L from "leaflet";
import type { RouteLngLat } from "@/lib/map/routeGeometryProvider";
import { blockMapClickBriefly } from "@/lib/map/blockMapClickBriefly";
import type { WaypointMode } from "./mapSharedComponents";

const iconWaypoint = L.divIcon({
  className: "werkit-route-waypoint-icon",
  html: `<div style="width:14px;height:14px;border-radius:50%;background:#fbbf24;border:2.5px solid #f59e0b;box-shadow:0 1px 5px rgba(0,0,0,0.35);cursor:grab;"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

/** Ikona w trybie usuwania — czerwona obwódka, zmieniony kursor. */
const iconWaypointRemove = L.divIcon({
  className: "werkit-route-waypoint-icon",
  html: `<div style="width:14px;height:14px;border-radius:50%;background:#fbbf24;border:3px solid #dc2626;box-shadow:0 1px 5px rgba(0,0,0,0.35);cursor:pointer;"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

export function RouteWaypointMarkers({
  waypoints,
  editable,
  onWaypointsChange,
  deleteLabel,
  waypointMode,
  onModeChange,
}: {
  waypoints: RouteLngLat[];
  editable: boolean;
  onWaypointsChange: (next: RouteLngLat[]) => void;
  deleteLabel: string;
  waypointMode?: WaypointMode;
  onModeChange?: (mode: WaypointMode) => void;
}) {
  if (waypoints.length === 0) return null;

  const updateAt = (index: number, lat: number, lng: number) => {
    onWaypointsChange(waypoints.map((wp, j) => (j === index ? { lat, lng } : wp)));
  };

  const removeAt = (index: number) => {
    blockMapClickBriefly();
    onWaypointsChange(waypoints.filter((_, j) => j !== index));
    // Po usunięciu wyjdź z trybu usuwania
    onModeChange?.(null);
  };

  const isRemoveMode = waypointMode === "remove";

  return (
    <>
      {waypoints.map((wp, i) => (
        <Marker
          key={`route-wp-${i}`}
          position={[wp.lat, wp.lng]}
          icon={isRemoveMode ? iconWaypointRemove : iconWaypoint}
          draggable={editable && !isRemoveMode}
          eventHandlers={{
            click: (e) => {
              L.DomEvent.stopPropagation(e);
              if (isRemoveMode) {
                removeAt(i);
                return;
              }
            },
            dragend: (e) => {
              const p = e.target.getLatLng();
              updateAt(i, p.lat, p.lng);
            },
          }}
        >
          {editable && !isRemoveMode ? (
            <Popup
              closeButton
              eventHandlers={{
                click: (e) => {
                  L.DomEvent.stopPropagation(e);
                },
              }}
            >
              <button
                type="button"
                className="text-xs font-semibold text-red-600 hover:text-red-500 whitespace-nowrap"
                onMouseDown={(ev) => {
                  ev.preventDefault();
                  ev.stopPropagation();
                }}
                onClick={(ev) => {
                  ev.preventDefault();
                  ev.stopPropagation();
                  removeAt(i);
                }}
              >
                {deleteLabel}
              </button>
            </Popup>
          ) : null}
        </Marker>
      ))}
    </>
  );
}
