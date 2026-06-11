"use client";

import type { Coord, TimelineItem } from "@/types/worker";
import { FollowPan, FollowPivotCenter, FitContentDebounced } from "./LiveMapBehaviors";

export interface LiveMapFollowBehaviorsProps {
  thumbnail: boolean;
  fitContentMode: boolean;
  navPivotMode: boolean;
  followPanMode: boolean;
  cameraFollowGps: boolean;
  currentLocation: { lat: number; lng: number; heading?: number | null };
  pathTraveled: Coord[];
  destination: { lat: number; lng: number } | null;
  routeToDest: [number, number][];
  events: TimelineItem[];
}

export function LiveMapFollowBehaviors({
  thumbnail,
  fitContentMode,
  navPivotMode,
  followPanMode,
  cameraFollowGps,
  currentLocation,
  pathTraveled,
  destination,
  routeToDest,
  events,
}: LiveMapFollowBehaviorsProps) {
  return (
    <>
      <FitContentDebounced
        enabled={fitContentMode}
        currentLocation={currentLocation}
        pathTraveled={pathTraveled}
        destination={destination}
        routeToDest={routeToDest}
        events={events}
        animate={!thumbnail}
      />
      <FollowPivotCenter
        lat={currentLocation.lat}
        lng={currentLocation.lng}
        active={navPivotMode}
        followEnabled={cameraFollowGps}
      />
      <FollowPan
        lat={currentLocation.lat}
        lng={currentLocation.lng}
        active={followPanMode}
        followEnabled={cameraFollowGps}
      />
    </>
  );
}
