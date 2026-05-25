"use client";

import { Map as MapIcon } from "lucide-react";
import dynamic from "next/dynamic";
import { createContext, useContext } from "react";
import { getDictionary, type Locale } from "@/i18n";
import type { TimelineItem } from "@/types/worker";

const SessionDetailsLocaleContext = createContext<Locale>("pl");

/** next/dynamic nie przekazuje propsów do `loading` — locale ze kontekstu jak w rodzicu. */
function SessionMapLoader() {
  const locale = useContext(SessionDetailsLocaleContext);
  const ordersDict = getDictionary(locale).admin.orders;
  return (
    <div
      role="status"
      aria-label={ordersDict.sessionMapLoadingLabel}
      className="flex h-full w-full animate-pulse items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800"
    >
      <MapIcon className="h-8 w-8 text-zinc-400" />
    </div>
  );
}

const LiveMap = dynamic(() => import("@/components/Map/LiveMap"), {
  ssr: false,
  loading: SessionMapLoader,
});

interface SessionMapSectionProps {
  hasMapData: boolean;
  isStationary: boolean;
  currentLocation: { lat: number; lng: number };
  pathTraveled: { lat: number; lng: number }[];
  events: TimelineItem[];
  dict: {
    noGpsData: string;
  };
}

export { SessionDetailsLocaleContext };

export default function SessionMapSection({
  hasMapData,
  isStationary,
  currentLocation,
  pathTraveled,
  events,
  dict,
}: SessionMapSectionProps) {
  if (isStationary) return null;

  return (
    <div className="h-[400px] overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
      {hasMapData ? (
        <LiveMap
          currentLocation={currentLocation}
          pathTraveled={pathTraveled}
          destination={null}
          events={events}
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center bg-zinc-50 text-zinc-500 dark:bg-zinc-800/50">
          <MapIcon className="mb-2 h-8 w-8 opacity-50" />
          <p>{dict.noGpsData}</p>
        </div>
      )}
    </div>
  );
}
