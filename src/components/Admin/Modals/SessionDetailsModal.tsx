"use client";

import { useMemo, useState } from "react";
import { getDictionary, type Locale } from "@/i18n";
import { AdminModalShell } from "@/components/Admin/AdminModalShell";
import { AdminPasswordConfirmModal } from "@/components/Admin/AdminPasswordConfirmModal";
import { useAppDialog } from "@/components/AppDialogProvider";
import type { UnifiedGanttItem } from "@/types/admin";
import { SessionDetailsLocaleContext } from "./SessionMapSection";
import SessionPhotoLightbox from "./SessionPhotoLightbox";
import { SessionDetailsContent } from "./SessionDetailsContent";
import { SessionDetailsFooter } from "./SessionDetailsFooter";
import { useSessionDetailsData } from "./useSessionDetailsData";

export default function SessionDetailsModal({
  item,
  onClose,
  onEdit,
  canMutate,
  onForceCompleteSession,
  onDeleteArchivedSession,
  locale,
}: {
  item: UnifiedGanttItem;
  onClose: () => void;
  onEdit?: (item: UnifiedGanttItem) => void;
  canMutate?: boolean;
  onForceCompleteSession?: (sessionId: number) => Promise<void>;
  onDeleteArchivedSession?: (sessionId: number, adminPassword: string) => Promise<void>;
  locale?: Locale;
}) {
  const resolvedLocale = locale ?? "pl";
  const { confirm: appConfirm } = useAppDialog();
  const dictionary = useMemo(() => getDictionary(resolvedLocale), [resolvedLocale]);
  const dict = dictionary.admin.orders;
  const adminUi = dictionary.admin.ui;

  const [actionBusy, setActionBusy] = useState<null | "complete" | "delete">(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [deletePwdOpen, setDeletePwdOpen] = useState(false);
  const [deletePwdError, setDeletePwdError] = useState<string | null>(null);
  const apiErrors = dictionary.apiErrors as Record<string, string>;

  const { isLoading, pathTraveled, events, hasMapData, currentLocation, timelineItems, allPhotos } =
    useSessionDetailsData(item);

  const isStationary = Boolean(item.categoryIsStationary);

  const showSessionFooter =
    item._type === "SESSION" &&
    canMutate &&
    ((item.status === "IN_PROGRESS" && onForceCompleteSession) ||
      (item.status === "COMPLETED" && onDeleteArchivedSession));

  const footerContent = (
    <SessionDetailsFooter
      showSessionFooter={Boolean(showSessionFooter)}
      status={item.status}
      actionBusy={actionBusy}
      onForceComplete={
        item.status === "IN_PROGRESS" && onForceCompleteSession
          ? async () => {
              if (
                !dict.forceCompleteConfirm ||
                !(await appConfirm({ message: dict.forceCompleteConfirm, variant: "danger" }))
              )
                return;
              setActionBusy("complete");
              try {
                await onForceCompleteSession(item.id);
              } catch {
                /* alert po stronie rodzica */
              } finally {
                setActionBusy(null);
              }
            }
          : undefined
      }
      onDeleteArchived={
        item.status === "COMPLETED" && onDeleteArchivedSession
          ? () => {
              setDeletePwdError(null);
              setDeletePwdOpen(true);
            }
          : undefined
      }
      dict={dict}
    />
  );

  const handlePhotoClick = (url: string) => {
    const idx = allPhotos.indexOf(url);
    if (idx >= 0) setLightboxIndex(idx);
  };

  return (
    <SessionDetailsLocaleContext.Provider value={resolvedLocale}>
      <>
        <AdminModalShell
          open
          onClose={onClose}
          title={dict.sessionDetailsModalTitle}
          maxWidthClass="max-w-4xl"
          titleSize="lg"
          scrollableBody
          closeOnBackdropClick={false}
          footer={footerContent}
          footerClassName="flex flex-wrap justify-end gap-2"
        >
          <SessionDetailsContent
            item={item}
            isLoading={isLoading}
            hasMapData={hasMapData}
            isStationary={isStationary}
            currentLocation={currentLocation}
            pathTraveled={pathTraveled}
            events={events}
            timelineItems={timelineItems}
            allPhotos={allPhotos}
            onPhotoClick={handlePhotoClick}
            onEdit={onEdit}
            dict={dict}
          />
        </AdminModalShell>

        <AdminPasswordConfirmModal
          open={deletePwdOpen}
          onClose={() => {
            if (actionBusy === "delete") return;
            setDeletePwdOpen(false);
            setDeletePwdError(null);
          }}
          title={dict.deleteArchivedPasswordTitle}
          description={dict.deleteArchivedPasswordHint}
          confirmLabel={dict.deleteArchivedPasswordConfirm}
          isSubmitting={actionBusy === "delete"}
          error={deletePwdError}
          onConfirm={async (password) => {
            if (!onDeleteArchivedSession) return;
            setDeletePwdError(null);
            setActionBusy("delete");
            try {
              await onDeleteArchivedSession(item.id, password);
              setDeletePwdOpen(false);
            } catch (err) {
              const code = err instanceof Error ? err.message : "";
              setDeletePwdError(apiErrors[code] ?? code ?? dict.error);
            } finally {
              setActionBusy(null);
            }
          }}
        />

        <SessionPhotoLightbox
          photos={allPhotos}
          currentIndex={lightboxIndex!}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
          dict={dict}
          adminUi={adminUi}
        />
      </>
    </SessionDetailsLocaleContext.Provider>
  );
}
