"use client";

import { Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import type { RouteLngLat } from "@/lib/map/routeGeometryProvider";
import { blockMapClickBriefly } from "@/lib/map/blockMapClickBriefly";

const iconWaypoint = L.divIcon({
  className: "werkit-route-waypoint-icon",
  html: `<div style="width:14px;height:14px;border-radius:50%;background:#fbbf24;border:2.5px solid #f59e0b;box-shadow:0 1px 5px rgba(0,0,0,0.35);cursor:grab;"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

/** Gdy tryb usuwania aktywny — zmieniamy kursor i kolor markera. */
const iconWaypointRemove = L.divIcon({
  className: "werkit-route-waypoint-icon-remove",
  html: `<div style="width:16px;height:16px;border-radius:50%;background:#ef4444;border:3px solid #dc2626;box-shadow:0 1px 6px rgba(239,68,68,0.5);cursor:pointer;"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

export function RouteWaypointMarkers({
  waypoints,
  editable,
  onWaypointsChange,
  deleteLabel,
  removeMode = false,
  onRemoveModeExit,
}: {
  waypoints: RouteLngLat[];
  editable: boolean;
  onWaypointsChange: (next: RouteLngLat[]) => void;
  deleteLabel: string;
  /** Gdy true — kliknięcie na marker usuwa go (tryb usuwania). */
  removeMode?: boolean;
  /** Callback po usunięciu — wyjście z trybu usuwania. */
  onRemoveModeExit?: () => void;
}) {
  const map = useMap();

  if (waypoints.length === 0) return null;

  const updateAt = (index: number, lat: number, lng: number) => {
    onWaypointsChange(waypoints.map((wp, j) => (j === index ? { lat, lng } : wp)));
  };

  const removeAt = (index: number) => {
    blockMapClickBriefly();
    onWaypointsChange(waypoints.filter((_, j) => j !== index));
    onRemoveModeExit?.();
  };

  return (
    <>
      {waypoints.map((wp, i) => (
        <Marker
          key={`route-wp-${i}`}
          position={[wp.lat, wp.lng]}
          icon={removeMode ? iconWaypointRemove : iconWaypoint}
          draggable={editable && !removeMode}
          eventHandlers={{
            dragend: (e) => {
              const p = e.target.getLatLng();
              updateAt(i, p.lat, p.lng);
            },
            click: removeMode
              ? (e) => {
                  // W trybie usuwania — kliknięcie na marker = usuń
                  L.DomEvent.stopPropagation(e);
                  // Zamknij ewentualny popup
                  map.closePopup();
                  removeAt(i);
                }
              : undefined,
          }}
        >
          {/* Popup z przyciskiem usuwania tylko gdy editable i NIE w trybie removeMode */}
          {editable && !removeMode ? (
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
