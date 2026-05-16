import type { LeafletMouseEvent } from "leaflet";

/** Klik w marker, popup lub kontrolki Leaflet — nie traktuj jako „klik w mapę”. */
export function isLeafletUiClick(e: LeafletMouseEvent): boolean {
  const target = e.originalEvent?.target;
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(".leaflet-popup") ||
      target.closest(".leaflet-marker-icon") ||
      target.closest(".leaflet-control") ||
      target.closest(".werkit-route-waypoint-icon"),
  );
}
