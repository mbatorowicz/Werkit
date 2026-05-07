"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const LiveMap = dynamic(() => import("@/components/Map/LiveMap"), { 
  ssr: false, 
  loading: () => (
    <div className="w-full h-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
    </div>
  )
});

import { TimelineItem } from "@/types/worker";

interface MapWrapperProps {
  currentLocation: { lat: number; lng: number; heading?: number | null };
  pathTraveled: { lat: number; lng: number }[];
  destination: { lat: number; lng: number } | null;
  events?: TimelineItem[];
}

export default function MapWrapper(props: MapWrapperProps) {
  return <LiveMap {...props} />;
}
