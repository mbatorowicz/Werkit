"use client";

import type { TimelineItem } from "@/types/worker";
import { useMemo, useState, useEffect } from "react";
import { getDictionary, type Locale } from "@/i18n";
import { AdminModalShell } from "@/components/Admin/AdminModalShell";
import { AdminPasswordConfirmModal } from "@/components/Admin/AdminPasswordConfirmModal";
import { useAppDialog } from "@/components/AppDialogProvider";
import type { UnifiedGanttItem } from "@/types/admin";
import { displayPathFromRawGpsRows } from "@/lib/gps";
import { fetchWithDeviceTelemetry } from "@/lib/fetchWithDeviceTelemetry";
import { SessionDetailsLocaleContext } from "./SessionMapSection";
import SessionPhotoLightbox from "./SessionPhotoLightbox";
import { SessionDetailsContent } from "./SessionDetailsContent";
import { SessionDetailsFooter } from "./SessionDetailsFooter";

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

  const [logs, setLogs] = useState<
    Array<{ latitude?: unknown; longitude?: unknown; timestamp?: unknown }>
  >([]);
  const [photos, setPhotos] = useState<
    {
      id?: number;
      latitude?: string | null;
      longitude?: string | null;
      photoUrl?: string;
      photoType?: string;
      createdAt?: string;
    }[]
  >([]);
  const [notes, setNotes] = useState<
    {
      id?: number;
      latitude?: string | null;
      longitude?: string | null;
      note?: string;
      createdAt?: string;
    }[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionBusy, setActionBusy] = useState<null | "complete" | "delete">(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [deletePwdOpen, setDeletePwdOpen] = useState(false);
  const [deletePwdError, setDeletePwdError] = useState<string | null>(null);
  const apiErrors = dictionary.apiErrors as Record<string, string>;

  useEffect(() => {
    if (item._type !== "SESSION") return;
    let cancelled = false;
    const run = async () => {
      setIsLoading(true);
      try {
        const r = await fetchWithDeviceTelemetry(
          `Admin: work-session ${item.id}`,
          `/api/admin/work-sessions/${item.id}`,
          undefined,
          { category: "admin" }
        );
        if (!r.ok) return;
        const data = (await r.json()) as {
          logs?: { latitude?: unknown; longitude?: unknown; timestamp?: unknown }[];
          photos?: {
            id?: number;
            latitude?: string | null;
            longitude?: string | null;
            photoUrl?: string;
            photoType?: string;
            createdAt?: string;
          }[];
          notes?: {
            id?: number;
            latitude?: string | null;
            longitude?: string | null;
            note?: string;
            createdAt?: string;
          }[];
        };
        if (cancelled) return;
        if (data.logs) setLogs(data.logs);
        if (data.photos) setPhotos(data.photos);
        if (data.notes) setNotes(data.notes);
      } catch {
        /* sieć */
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    queueMicrotask(() => void run());
    return () => {
      cancelled = true;
    };
  }, [item]);

  const pathTraveled = displayPathFromRawGpsRows(logs, { reverseToChronological: true });
  const events: TimelineItem[] = [
    ...photos
      .filter((p): p is typeof p & { latitude: string; longitude: string } =>
        Boolean(p.latitude && p.longitude)
      )
      .map((p) => ({
        lat: parseFloat(p.latitude),
        lng: parseFloat(p.longitude),
        id: `photo_${p.id ?? ""}`,
        content: p.photoUrl ?? "",
        type: "photo" as const,
        createdAt: p.createdAt ?? "",
      })),
    ...notes
      .filter((n): n is typeof n & { latitude: string; longitude: string; note: string } =>
        Boolean(n.latitude && n.longitude && n.note)
      )
      .map((n) => ({
        lat: parseFloat(n.latitude),
        lng: parseFloat(n.longitude),
        id: `note_${n.id ?? ""}`,
        content: n.note,
        type: "note" as const,
        createdAt: n.createdAt ?? "",
      })),
  ];
  const hasMapData = logs.length > 0 || events.length > 0;
  const isStationary = Boolean(item.categoryIsStationary);
  const currentLocation =
    logs.length > 0
      ? pathTraveled[pathTraveled.length - 1]
      : events.length > 0
        ? events[events.length - 1]
        : { lat: 52.2297, lng: 21.0122 };

  const timelineItems = [
    ...photos.map((p) => ({
      ...p,
      type: "photo" as const,
      time: new Date(p.createdAt ?? 0).getTime(),
    })),
    ...notes.map((n) => ({
      ...n,
      type: "note" as const,
      time: new Date(n.createdAt ?? 0).getTime(),
    })),
  ].sort((a, b) => b.time - a.time);
  const allPhotos = timelineItems
    .filter(
      (entry): entry is typeof entry & { photoUrl: string } =>
        entry.type === "photo" && typeof entry.photoUrl === "string"
    )
    .map((p) => p.photoUrl);

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
