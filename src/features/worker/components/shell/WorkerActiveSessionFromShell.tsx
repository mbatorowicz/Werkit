"use client";

import type { ComponentProps } from "react";
import type { useWorkerShellState } from "@/features/worker/hooks/useWorkerShellState";
import { WorkerActiveSessionSection } from "./WorkerActiveSessionSection";

type SectionProps = ComponentProps<typeof WorkerActiveSessionSection>;
type WorkerShell = ReturnType<typeof useWorkerShellState>;

type Props = Pick<
  SectionProps,
  | "dict"
  | "isTimeOverrun"
  | "isCancelWindowOpen"
  | "setNoteText"
  | "setEditingNoteId"
  | "setIsNotesModalOpen"
  | "handlePhotoUpload"
  | "handleCheckpoint"
  | "handleCancelSession"
  | "handleEndSession"
> & { shell: WorkerShell };

export function WorkerActiveSessionFromShell({ shell, ...rest }: Props) {
  if (!shell.session) return null;
  return (
    <WorkerActiveSessionSection
      {...rest}
      session={shell.session}
      isStationarySession={Boolean(shell.session.categoryIsStationary)}
      queuedPendingOrders={shell.workOrders}
      gpsStatus={shell.gpsStatus}
      traveledKm={shell.traveledKm}
      destination={shell.destination}
      distanceToDestKm={shell.distanceToDestKm}
      location={shell.location}
      pathTraveled={shell.pathTraveled}
      timelineEvents={shell.timelineEvents}
      isTimelineOpen={shell.isTimelineOpen}
      setIsTimelineOpen={shell.setIsTimelineOpen}
      selectedEventId={shell.selectedEventId}
      setSelectedEventId={shell.setSelectedEventId}
      settings={shell.settings}
      currentUser={shell.currentUser}
      setDistanceToDestKm={shell.setDistanceToDestKm}
      plannedRouteWaypoints={shell.routeWaypoints}
      canEditRoute={Boolean(shell.currentUser?.canEditRoute)}
      onRouteWaypointsChange={(next) => {
        void shell.persistRouteWaypoints(next);
      }}
    />
  );
}
