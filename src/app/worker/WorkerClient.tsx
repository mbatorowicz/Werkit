"use client";

import { useState } from "react";
import { useDictionary } from "@/i18n";
import type { InitialWorkerData } from "@/types/worker";

import { useWorkerAlarmSound } from "@/features/worker/hooks/useWorkerAlarmSound";
import { useWorkerNotifications } from "@/features/worker/hooks/useWorkerNotifications";
import { useWorkerNotificationActions } from "@/features/worker/hooks/useWorkerNotificationActions";
import { useWorkerGpsActions } from "@/features/worker/hooks/useWorkerGpsActions";
import { useCancelWindow } from "@/features/worker/hooks/useCancelWindow";
import { WorkerAlarmModal } from "@/features/worker/components/WorkerAlarmModal";
import { useWorkerActions } from "@/features/worker/hooks/useWorkerActions";
import { useWorkerShellState } from "@/features/worker/hooks/useWorkerShellState";
import { WorkerActiveSessionFromShell } from "@/features/worker/components/shell/WorkerActiveSessionFromShell";
import { WorkerClientFooter } from "@/features/worker/components/shell/WorkerClientFooter";
import { WorkerClientLoading } from "@/features/worker/components/shell/WorkerClientLoading";
import { WorkerClientModals } from "@/features/worker/components/shell/WorkerClientModals";
import { WorkerIdleSection } from "@/features/worker/components/shell/WorkerIdleSection";
import { OfflineBanner } from "@/components/OfflineBanner";

export default function WorkerClient({ initialData }: { initialData: InitialWorkerData | null }) {
  const dictionary = useDictionary();
  const dict = dictionary.worker.client;
  const alarmsDict = dictionary.worker.alarms;

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
  const [delegateModalOpen, setDelegateModalOpen] = useState(false);
  const hasDelegationRights = initialData?.hasDelegationRights ?? false;

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
        <WorkerIdleSection
          hasDelegationRights={hasDelegationRights}
          delegateModalOpen={delegateModalOpen}
          setDelegateModalOpen={setDelegateModalOpen}
          onDelegateSuccess={() => shell.fetchSessionAndPath(true, false)}
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
        <WorkerActiveSessionFromShell
          shell={shell}
          dict={dict}
          isTimeOverrun={isTimeOverrun}
          isCancelWindowOpen={isCancelWindowOpen}
          setNoteText={setNoteText}
          setEditingNoteId={setEditingNoteId}
          setIsNotesModalOpen={setIsNotesModalOpen}
          handlePhotoUpload={(e: React.ChangeEvent<HTMLInputElement>) =>
            handlePhotoUpload(e, shell.location)
          }
          handleCheckpoint={() => handleCheckpoint(shell.location)}
          handleCancelSession={handleCancelSession}
          handleEndSession={handleEndSession}
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
