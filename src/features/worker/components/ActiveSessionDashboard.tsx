"use client";

import { useMemo } from "react";
import type { AppDictionary } from "@/i18n/types";
import { formatDict, useAppLocale, useDictionary } from "@/i18n";
import { Session, Coord, AppSettings, TimelineItem, WorkOrder } from "@/types/worker";
import { formatCustomerLabel } from "@/lib/customerSearch";
import { QueuedPendingOrdersDuringSession } from "@/features/worker/components/QueuedPendingOrdersDuringSession";
import { ActiveSessionTimelinePanel } from "@/features/worker/components/ActiveSessionTimelinePanel";
import WorkerSparePartsPanel from "@/features/worker/components/WorkerSparePartsPanel";
import { useWorkerOrderDetailsModal } from "@/features/worker/hooks/useWorkerOrderDetailsModal";
import { workerOrderDetailsFromSession } from "@/features/worker/lib/workerOrderDetails";
import {
  ActiveSessionActions,
  ActiveSessionMapSection,
  ActiveSessionOrderCard,
  ActiveSessionRouteStats,
  ActiveSessionStatusWidget,
  ActiveSessionTimeOverrunBanner,
} from "@/features/worker/components/ActiveSessionDashboardSections";

interface ActiveSessionDashboardProps {
  session: Session;
  /** Kategoria sprzętu „stacjonarna” — uproszczony panel bez mapy trasy i bez pilnowania GPS. */
  isStationarySession?: boolean;
  /** Zlecenia PENDING przypisane do pracownika (kolejka po zakończeniu bieżącej sesji). */
  queuedPendingOrders: WorkOrder[];
  dict: AppDictionary["worker"]["client"];
  isTimeOverrun: boolean;
  gpsStatus: "waiting" | "active" | "error";
  traveledKm: number;
  destination: Coord | null;
  distanceToDestKm: number | null;
  location: Coord | null;
  pathTraveled: Coord[];
  timelineEvents: TimelineItem[];
  isTimelineOpen: boolean;
  setIsTimelineOpen: (val: boolean) => void;
  selectedEventId: string | null;
  setSelectedEventId: (val: string | null) => void;
  setNoteText: (val: string) => void;
  setEditingNoteId: (val: number | null) => void;
  setIsNotesModalOpen: (val: boolean) => void;
  handlePhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleCheckpoint: () => void;
  isCancelWindowOpen: boolean;
  handleCancelSession: () => void;
  handleEndSession: () => void;
  settings: AppSettings | null;
  currentUser: { isDurWorker?: boolean } | null;
  setDistanceToDestKm: (val: number | null) => void;
  plannedRouteWaypoints: Coord[];
  canEditRoute: boolean;
  onRouteWaypointsChange: (next: Coord[]) => void;
}

export default function ActiveSessionDashboard({
  session,
  isStationarySession = false,
  queuedPendingOrders,
  dict,
  isTimeOverrun,
  gpsStatus,
  traveledKm,
  destination,
  distanceToDestKm,
  location,
  pathTraveled,
  timelineEvents,
  isTimelineOpen,
  setIsTimelineOpen,
  selectedEventId,
  setSelectedEventId,
  setNoteText,
  setEditingNoteId,
  setIsNotesModalOpen,
  handlePhotoUpload,
  handleCheckpoint,
  isCancelWindowOpen,
  handleCancelSession,
  handleEndSession,
  settings,
  currentUser,
  setDistanceToDestKm,
  plannedRouteWaypoints,
  canEditRoute,
  onRouteWaypointsChange,
}: ActiveSessionDashboardProps) {
  const dictionary = useDictionary();
  const locale = useAppLocale();
  const tonsSuffix = dictionary.workOrdersSchedule.tons;
  const { openOrderDetails, orderDetailsModal } = useWorkerOrderDetailsModal();

  // Derive destination name from session customer info
  const destinationName = useMemo(() => {
    if (!destination) return undefined;
    const name = formatCustomerLabel({
      firstName: session.customerFirstName ?? null,
      lastName: session.customerLastName ?? null,
    });
    if (name) return name;
    if (session.customerAddress) return session.customerAddress;
    return undefined;
  }, [destination, session.customerLastName, session.customerFirstName, session.customerAddress]);

  return (
    <div className="w-full flex flex-col items-center gap-4">
      {/* SZCZEGÓŁY ZLECENIA */}
      <div className="w-full bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 shadow-sm">
        <QueuedPendingOrdersDuringSession orders={queuedPendingOrders} dict={dict} />
        <ActiveSessionOrderCard
          session={session}
          dict={dict}
          tonsSuffix={tonsSuffix}
          locale={locale}
          timelineEvents={timelineEvents}
          onOpenDetails={() =>
            openOrderDetails(workerOrderDetailsFromSession(session, tonsSuffix, dict, locale))
          }
        />
      </div>
      {orderDetailsModal}

      {/* CZĘŚCI ZAMIENNE — tylko dla napraw */}
      <WorkerSparePartsPanel
        workOrderId={session.workOrderId ?? null}
        orderType={session.orderType ?? null}
        resourceGroupId={session.resourceGroupId ?? null}
        durEnabled={Boolean(settings?.durEnabled)}
        isDurWorker={Boolean(currentUser?.isDurWorker)}
      />

      {/* WIDGET STATUSU */}
      <ActiveSessionStatusWidget
        dict={dict}
        isStationarySession={isStationarySession}
        gpsStatus={gpsStatus}
        startTime={session.startTime}
      />

      {isTimeOverrun && <ActiveSessionTimeOverrunBanner dict={dict} />}

      {/* WIDGET TRASY */}
      {!isStationarySession && (
        <ActiveSessionRouteStats
          dict={dict}
          traveledKm={traveledKm}
          destination={destination}
          distanceToDestKm={distanceToDestKm}
        />
      )}

      {/* MAPA — ukryta dla trybu stacjonarnego (brak sensu śledzenia trasy na mapie) */}
      {!isStationarySession && (
        <ActiveSessionMapSection
          location={location}
          pathTraveled={pathTraveled}
          destination={destination}
          plannedRouteWaypoints={plannedRouteWaypoints}
          canEditRoute={canEditRoute}
          onRouteWaypointsChange={onRouteWaypointsChange}
          setDistanceToDestKm={setDistanceToDestKm}
          timelineEvents={timelineEvents}
          setIsTimelineOpen={setIsTimelineOpen}
          setSelectedEventId={setSelectedEventId}
          destinationName={destinationName}
        />
      )}

      <ActiveSessionTimelinePanel
        timelineEvents={timelineEvents}
        isTimelineOpen={isTimelineOpen}
        setIsTimelineOpen={setIsTimelineOpen}
        selectedEventId={selectedEventId}
        timelineToggleLabel={formatDict(dictionary.admin.orderFields.timelineToggle, {
          count: timelineEvents.length,
        })}
      />

      <ActiveSessionActions
        dict={dict}
        settings={settings}
        isStationarySession={isStationarySession}
        setNoteText={setNoteText}
        setEditingNoteId={setEditingNoteId}
        setIsNotesModalOpen={setIsNotesModalOpen}
        handlePhotoUpload={handlePhotoUpload}
        handleCheckpoint={handleCheckpoint}
        isCancelWindowOpen={isCancelWindowOpen}
        handleCancelSession={handleCancelSession}
        handleEndSession={handleEndSession}
      />
    </div>
  );
}
