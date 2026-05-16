"use client";

import { Marker, Popup } from "react-leaflet";
import L from "leaflet";
import type { RouteLngLat } from "@/lib/map/routeGeometryProvider";
import { blockMapClickBriefly } from "@/lib/map/blockMapClickBriefly";

const iconWaypoint = L.divIcon({
  className: "werkit-route-waypoint-icon",
  html: `<div style="width:14px;height:14px;border-radius:50%;background:#fbbf24;border:2.5px solid #f59e0b;box-shadow:0 1px 5px rgba(0,0,0,0.35);cursor:grab;"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

export function RouteWaypointMarkers({
  waypoints,
  editable,
  onWaypointsChange,
  deleteLabel,
}: {
  waypoints: RouteLngLat[];
  editable: boolean;
  onWaypointsChange: (next: RouteLngLat[]) => void;
  deleteLabel: string;
}) {
  if (waypoints.length === 0) return null;

  const updateAt = (index: number, lat: number, lng: number) => {
    onWaypointsChange(waypoints.map((wp, j) => (j === index ? { lat, lng } : wp)));
  };

  const removeAt = (index: number) => {
    blockMapClickBriefly();
    onWaypointsChange(waypoints.filter((_, j) => j !== index));
  };

  return (
    <>
      {waypoints.map((wp, i) => (
        <Marker
          key={`route-wp-${i}`}
          position={[wp.lat, wp.lng]}
          icon={iconWaypoint}
          draggable={editable}
          eventHandlers={{
            click: (e) => {
              L.DomEvent.stopPropagation(e);
            },
            dragend: (e) => {
              const p = e.target.getLatLng();
              updateAt(i, p.lat, p.lng);
            },
          }}
        >
          {editable ? (
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
