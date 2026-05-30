"use client";

import { Marker, Popup } from "react-leaflet";
import Image from "next/image";
import type { TimelineItem } from "@/types/worker";
import { iconEvent, iconNote, iconPhoto } from "./liveMapIcons";

interface EventMarkersProps {
  events: TimelineItem[];
  thumbnail: boolean;
  onEventClick?: (id: string) => void;
  dict: {
    eventPhoto: string;
    eventNote: string;
    eventAlt: string;
  };
}

export function EventMarkers({ events, thumbnail, onEventClick, dict }: EventMarkersProps) {
  return (
    <>
      {events.map((ev, i) => (
        <Marker
          key={ev.id || String(i)}
          position={[ev.lat, ev.lng]}
          icon={ev.type === "photo" ? iconPhoto : ev.type === "note" ? iconNote : iconEvent}
          {...(!thumbnail
            ? {
                eventHandlers: {
                  click: () => onEventClick?.(ev.id),
                },
              }
            : {})}
        >
          {!thumbnail ? (
            <Popup>
              <div className="flex flex-col gap-2 min-w-[150px] max-w-[250px]">
                <p className="font-semibold m-0">{ev.type === "photo" ? dict.eventPhoto : dict.eventNote}</p>
                {ev.type === "note" ? <p className="text-sm italic m-0 break-words">{ev.content}</p> : null}
                {ev.type === "photo" ? (
                  <Image
                    src={ev.content}
                    alt={dict.eventAlt}
                    width={250}
                    height={150}
                    unoptimized
                    className="w-full rounded-md object-cover max-h-[150px]"
                  />
                ) : null}
              </div>
            </Popup>
          ) : null}
        </Marker>
      ))}
    </>
  );
}
