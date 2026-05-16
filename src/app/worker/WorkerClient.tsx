"use client";

import { useState, useCallback, useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { getDictionary } from "@/i18n";
import { getCurrentPositionOnce } from "@/lib/geolocationOnce";
import type { InitialWorkerData } from "@/types/worker";

import { useWorkerNotifications } from "@/features/worker/hooks/useWorkerNotifications";
import { useWorkerNotificationActions } from "@/features/worker/hooks/useWorkerNotificationActions";
import { WorkerAlarmModal } from "@/features/worker/components/WorkerAlarmModal";
import { useWorkerActions } from "@/features/worker/hooks/useWorkerActions";
import { useWorkerShellState } from "@/features/worker/hooks/useWorkerShellState";
import { WorkerActiveSessionSection } from "@/features/worker/components/worker/WorkerActiveSessionSection";
import { WorkerClientFooter } from "@/features/worker/components/worker/WorkerClientFooter";
import { WorkerClientLoading } from "@/features/worker/components/worker/WorkerClientLoading";
import { WorkerClientModals } from "@/features/worker/components/worker/WorkerClientModals";
import { WorkerPendingOrdersSection } from "@/features/worker/components/worker/WorkerPendingOrdersSection";

export default function WorkerClient({ initialData }: { initialData: InitialWorkerData | null }) {
  const dict = getDictionary().worker.client;
  const alarmsDict = getDictionary().worker.alarms;
  const adminDict = getDictionary().admin.orders;

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
  /** Zegar do okna anulowania — bez `Date.now()` w renderze (React 19 / purity). */
  const [cancelWindowClock, setCancelWindowClock] = useState(() => Date.now());
  useEffect(() => {
    const tick = () => setCancelWindowClock(Date.now());
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, [shell.session?.id, shell.session?.startTime]);

  const requestAcceptOrder = useCallback(
    (orderId: number) => {
      if (Capacitor.isNativePlatform()) {
        const verified = localStorage.getItem("werkit_bg_loc_verified");
        if (verified !== "true") {
          setPendingOrderId(orderId);
          setShowGpsWarning(true);
          return;
        }
      }
      void (async () => {
        const startLoc = shell.location ?? (await getCurrentPositionOnce());
        await submitAcceptOrder(orderId, startLoc);
      })();
    },
    [shell.location, submitAcceptOrder],
  );

  const isCancelWindowOpen =
    shell.session && shell.settings?.cancelWindowMinutes
      ? (cancelWindowClock - new Date(shell.session.startTime).getTime()) / 60000 <=
        shell.settings.cancelWindowMinutes
      : true;

  const {
    isTimeOverrun,
    overdueOrder,
    upcomingOrder,
    activeAlarm,
    dismissActiveAlarm,
    snoozeActiveAlarm,
    refreshAlarmUi,
  } = useWorkerNotifications(
    shell.session,
    shell.workOrders,
    shell.settings,
    shell.currentUser,
  );

  useWorkerNotificationActions({
    onStartOrder: (orderId) => requestAcceptOrder(orderId),
    onAlarmDismissed: () => refreshAlarmUi(),
  });

  if (shell.isLoading) {
    return <WorkerClientLoading message={dict.loadingWorkerDashboard} />;
  }

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-start space-y-6 py-4">
      {!shell.session ? (
        <WorkerPendingOrdersSection
          workOrders={shell.workOrders}
          overdueOrder={overdueOrder}
          upcomingOrder={upcomingOrder}
          currentUser={shell.currentUser}
          dict={dict}
          requestAcceptOrder={requestAcceptOrder}
          fetchSessionAndPath={shell.fetchSessionAndPath}
        />
      ) : (
        <WorkerActiveSessionSection
          session={shell.session}
          isStationarySession={Boolean(shell.session.categoryIsStationary)}
          queuedPendingOrders={shell.workOrders}
          dict={dict}
          adminDict={adminDict}
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
          handlePhotoUpload={(e: React.ChangeEvent<HTMLInputElement>) => handlePhotoUpload(e, shell.location)}
          handleCheckpoint={() => handleCheckpoint(shell.location)}
          isCancelWindowOpen={isCancelWindowOpen}
          handleCancelSession={handleCancelSession}
          handleEndSession={() => {
            void (async () => {
              const endLoc = shell.location ?? (await getCurrentPositionOnce());
              await submitEndSession(endLoc);
            })();
          }}
          settings={shell.settings}
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
          handleAcceptOrder: (orderId) => {
            void (async () => {
              const startLoc = shell.location ?? (await getCurrentPositionOnce());
              await submitAcceptOrder(orderId, startLoc);
            })();
          },
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
