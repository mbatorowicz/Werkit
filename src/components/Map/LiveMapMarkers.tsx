"use client";

import { Marker, Popup, Polyline } from "react-leaflet";
import type { Icon, DivIcon } from "leaflet";
import type { AppDictionary } from "@/i18n/types";
import type { Coord, TimelineItem } from "@/types/worker";
import { iconDest, iconStart } from "./liveMapIcons";
import { EventMarkers } from "./EventMarkers";

export interface LiveMapMarkersProps {
  thumbnail: boolean;
  pathTraveled: Coord[];
  routeToDest: [number, number][];
  events: TimelineItem[];
  onEventClick?: (id: string) => void;
  destination: { lat: number; lng: number } | null;
  currentLocation: { lat: number; lng: number; heading?: number | null };
  currentMarkerIcon: Icon | DivIcon;
  dict: AppDictionary["admin"]["map"];
}

export function LiveMapMarkers({
  thumbnail,
  pathTraveled,
  routeToDest,
  events,
  onEventClick,
  destination,
  currentLocation,
  currentMarkerIcon,
  dict,
}: LiveMapMarkersProps) {
  return (
    <>
      {pathTraveled.length > 0 ? (
        <Marker position={[pathTraveled[0].lat, pathTraveled[0].lng]} icon={iconStart}>
          {!thumbnail && <Popup>{dict.startPoint}</Popup>}
        </Marker>
      ) : null}

      {/* Trasa — zawsze jako przerywana czerwona linia (podgląd) na miniaturze */}
      {routeToDest.length > 0 ? (
        <Polyline
          positions={routeToDest}
          color="#ef4444"
          weight={4}
          dashArray="5, 10"
          opacity={0.8}
        />
      ) : null}

      <EventMarkers events={events} thumbnail={thumbnail} onEventClick={onEventClick} dict={dict} />

      {destination ? (
        <Marker position={[destination.lat, destination.lng]} icon={iconDest}>
          {!thumbnail && <Popup>{dict.destination}</Popup>}
        </Marker>
      ) : null}

      <Marker position={[currentLocation.lat, currentLocation.lng]} icon={currentMarkerIcon}>
        {!thumbnail && <Popup>{dict.currentLocation}</Popup>}
      </Marker>
    </>
  );
}
