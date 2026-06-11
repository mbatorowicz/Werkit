"use client";

import { Marker, Popup } from "react-leaflet";
import type { TimelineItem } from "@/types/worker";
import { iconEvent, iconNote, iconPhoto } from "./liveMapIcons";

export interface FullScreenMapEventMarkersProps {
  events: TimelineItem[];
  photoLabel: string;
  noteLabel: string;
  onEventClick?: (id: string) => void;
}

export function FullScreenMapEventMarkers({
  events,
  photoLabel,
  noteLabel,
  onEventClick,
}: FullScreenMapEventMarkersProps) {
  return (
    <>
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
              <p className="font-semibold m-0">{ev.type === "photo" ? photoLabel : noteLabel}</p>
              {ev.type === "note" ? (
                <p className="text-sm italic m-0 break-words">{ev.content}</p>
              ) : null}
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
}
