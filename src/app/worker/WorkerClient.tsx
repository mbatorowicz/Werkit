"use client";

import { useState } from "react";
import { getDictionary } from "@/i18n";
import type { InitialWorkerData } from "@/types/worker";

import { useWorkerAlarmSound } from "@/features/worker/hooks/useWorkerAlarmSound";
import { useWorkerNotifications } from "@/features/worker/hooks/useWorkerNotifications";
import { useWorkerNotificationActions } from "@/features/worker/hooks/useWorkerNotificationActions";
import { useWorkerGpsActions } from "@/features/worker/hooks/useWorkerGpsActions";
import { useCancelWindow } from "@/features/worker/hooks/useCancelWindow";
import { WorkerAlarmModal } from "@/features/worker/components/WorkerAlarmModal";
import { useWorkerActions } from "@/features/worker/hooks/useWorkerActions";
import { useWorkerShellState } from "@/features/worker/hooks/useWorkerShellState";
import { WorkerActiveSessionSection } from "@/features/worker/components/shell/WorkerActiveSessionSection";
import { WorkerClientFooter } from "@/features/worker/components/shell/WorkerClientFooter";
import { WorkerClientLoading } from "@/features/worker/components/shell/WorkerClientLoading";
import { WorkerClientModals } from "@/features/worker/components/shell/WorkerClientModals";
import { WorkerPendingOrdersSection } from "@/features/worker/components/shell/WorkerPendingOrdersSection";
import { OfflineBanner } from "@/components/OfflineBanner";

export default function WorkerClient({ initialData }: { initialData: InitialWorkerData | null }) {
  const dict = getDictionary().worker.client;
  const alarmsDict = getDictionary().worker.alarms;

  const shell = useWorkerShellState(initialData);

  const {
    isNotesModalOpen,
    setIsNotesModalOpen,
    noteText,
    setNoteText,
    isSubmittingNote,
    editingNoteId,
    setEditingNoteId,
    handleEndSession: submitEndSession,
    handleAcceptOrder: submitAcceptOrder,
    handleCancelSession,
    handleCheckpoint,
    handleSaveNote,
    handlePhotoUpload,
    acceptErrors,
  } = useWorkerActions({
    dict,
    fetchSessionAndPath: shell.fetchSessionAndPath,
    setIsLoading: shell.setIsLoading,
    timelineEvents: shell.timelineEvents,
    settings: shell.settings,
    distanceToDestKm: shell.distanceToDestKm,
    categoryIsStationary: Boolean(shell.session?.categoryIsStationary),
  });

  const [showGpsWarning, setShowGpsWarning] = useState(false);
  const [pendingOrderId, setPendingOrderId] = useState<number | null>(null);

  const { requestAcceptOrder, handleEndSession, handleAcceptOrderFromModal } = useWorkerGpsActions({
    location: shell.location,
    submitAcceptOrder,
    submitEndSession,
    setPendingOrderId,
    setShowGpsWarning,
  });

  const { isCancelWindowOpen } = useCancelWindow({
    session: shell.session,
    cancelWindowMinutes: shell.settings?.cancelWindowMinutes,
  });

  const {
    isTimeOverrun,
    overdueOrder,
    upcomingOrder,
    activeAlarm,
    dismissActiveAlarm,
    snoozeActiveAlarm,
    refreshAlarmUi,
  } = useWorkerNotifications(shell.session, shell.workOrders, shell.settings, shell.currentUser);

  useWorkerNotificationActions({
    onStartOrder: (orderId) => requestAcceptOrder(orderId),
    onAlarmDismissed: () => refreshAlarmUi(),
  });

  useWorkerAlarmSound(activeAlarm);

  if (shell.isLoading) {
    return <WorkerClientLoading message={dict.loadingWorkerDashboard} />;
  }

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-start space-y-6 py-4">
      <OfflineBanner />
      {!shell.session ? (
        <WorkerPendingOrdersSection
          workOrders={shell.workOrders}
          overdueOrder={overdueOrder}
          upcomingOrder={upcomingOrder}
          currentUser={shell.currentUser}
          dict={dict}
          requestAcceptOrder={requestAcceptOrder}
          fetchSessionAndPath={shell.fetchSessionAndPath}
          acceptErrors={acceptErrors}
        />
      ) : (
        <WorkerActiveSessionSection
          session={shell.session}
          isStationarySession={Boolean(shell.session.categoryIsStationary)}
          queuedPendingOrders={shell.workOrders}
          dict={dict}
          isTimeOverrun={isTimeOverrun}
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
          setNoteText={setNoteText}
          setEditingNoteId={setEditingNoteId}
          setIsNotesModalOpen={setIsNotesModalOpen}
          handlePhotoUpload={(e: React.ChangeEvent<HTMLInputElement>) =>
            handlePhotoUpload(e, shell.location)
          }
          handleCheckpoint={() => handleCheckpoint(shell.location)}
          isCancelWindowOpen={isCancelWindowOpen}
          handleCancelSession={handleCancelSession}
          handleEndSession={handleEndSession}
          settings={shell.settings}
          currentUser={shell.currentUser}
          setDistanceToDestKm={shell.setDistanceToDestKm}
          plannedRouteWaypoints={shell.routeWaypoints}
          canEditRoute={Boolean(shell.currentUser?.canEditRoute)}
          onRouteWaypointsChange={(next) => {
            void shell.persistRouteWaypoints(next);
          }}
        />
      )}

      <WorkerClientModals
        notes={{
          dict,
          isNotesModalOpen,
          setIsNotesModalOpen,
          noteText,
          setNoteText,
          isSubmittingNote,
          handleSaveNote: () => handleSaveNote(shell.location),
          editingNoteId,
          setEditingNoteId,
          timelineEvents: shell.timelineEvents,
        }}
        gps={{
          dict,
          showGpsWarning,
          setShowGpsWarning,
          pendingOrderId,
          setPendingOrderId,
          handleAcceptOrder: handleAcceptOrderFromModal,
        }}
      />

      <WorkerClientFooter />

      {activeAlarm ? (
        <WorkerAlarmModal
          alarm={activeAlarm}
          dict={alarmsDict}
          onOk={dismissActiveAlarm}
          onStart={() => {
            if (activeAlarm.orderId != null) {
              dismissActiveAlarm();
              requestAcceptOrder(activeAlarm.orderId);
            }
          }}
          onSnooze={snoozeActiveAlarm}
        />
      ) : null}
    </div>
  );
}
