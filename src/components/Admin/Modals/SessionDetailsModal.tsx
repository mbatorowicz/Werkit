"use client";

import type { TimelineItem } from "@/types/worker";
import { useMemo, useState, useEffect } from "react";
import {
  Map as MapIcon,
  Loader2,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import { getDictionary, type Locale } from "@/i18n";
import { formatUiDateOnly, formatUiTimeHm } from "@/i18n/format";
import { OrderLabelCard } from "@/components/work-orders/OrderLabelCard";
import { AdminModalShell } from "@/components/Admin/AdminModalShell";
import { AdminPasswordConfirmModal } from "@/components/Admin/AdminPasswordConfirmModal";
import { useAppDialog } from "@/components/AppDialogProvider";
import type { UnifiedGanttItem } from "@/types/admin";
import { displayPathFromRawGpsRows } from "@/lib/gps";
import { fetchWithDeviceTelemetry } from "@/lib/fetchWithDeviceTelemetry";
import SessionMapSection, { SessionDetailsLocaleContext } from "./SessionMapSection";
import SessionTimelinePanel from "./SessionTimelinePanel";
import SessionPhotoLightbox from "./SessionPhotoLightbox";

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

  const [logs, setLogs] = useState<Array<{ latitude?: unknown; longitude?: unknown; timestamp?: unknown }>>([]);
  const [photos, setPhotos] = useState<
    { id?: number; latitude?: string | null; longitude?: string | null; photoUrl?: string; photoType?: string; createdAt?: string }[]
  >([]);
  const [notes, setNotes] = useState<
    { id?: number; latitude?: string | null; longitude?: string | null; note?: string; createdAt?: string }[]
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
          { category: "admin" },
        );
        if (!r.ok) return;
        const data = (await r.json()) as {
          logs?: { latitude?: unknown; longitude?: unknown; timestamp?: unknown }[];
          photos?: { id?: number; latitude?: string | null; longitude?: string | null; photoUrl?: string; photoType?: string; createdAt?: string }[];
          notes?: { id?: number; latitude?: string | null; longitude?: string | null; note?: string; createdAt?: string }[];
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
      .filter((p): p is typeof p & { latitude: string; longitude: string } => Boolean(p.latitude && p.longitude))
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
        Boolean(n.latitude && n.longitude && n.note),
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
    ...photos.map((p) => ({ ...p, type: "photo" as const, time: new Date(p.createdAt ?? 0).getTime() })),
    ...notes.map((n) => ({ ...n, type: "note" as const, time: new Date(n.createdAt ?? 0).getTime() })),
  ].sort((a, b) => b.time - a.time);
  const allPhotos = timelineItems
    .filter((entry): entry is typeof entry & { photoUrl: string } => entry.type === "photo" && typeof entry.photoUrl === "string")
    .map((p) => p.photoUrl);

  const showSessionFooter =
    item._type === "SESSION" &&
    canMutate &&
    ((item.status === "IN_PROGRESS" && onForceCompleteSession) ||
      (item.status === "COMPLETED" && onDeleteArchivedSession));

  const footerContent = showSessionFooter ? (
    <>
      {item.status === "IN_PROGRESS" && onForceCompleteSession ? (
        <button
          type="button"
          disabled={actionBusy !== null}
          onClick={async () => {
            if (!dict.forceCompleteConfirm || !(await appConfirm({ message: dict.forceCompleteConfirm, variant: "danger" }))) return;
            setActionBusy("complete");
            try {
              await onForceCompleteSession(item.id);
            } catch {
              /* alert po stronie rodzica */
            } finally {
              setActionBusy(null);
            }
          }}
          className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
        >
          {actionBusy === "complete" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          {dict.forceCompleteLabel}
        </button>
      ) : null}
      {item.status === "COMPLETED" && onDeleteArchivedSession ? (
        <button
          type="button"
          disabled={actionBusy !== null}
          onClick={() => {
            setDeletePwdError(null);
            setDeletePwdOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-500/15 disabled:opacity-50 dark:border-red-500/25 dark:text-red-400"
        >
          {actionBusy === "delete" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          {dict.deleteArchivedLabel}
        </button>
      ) : null}
    </>
  ) : undefined;

  const categoryLabel = ((item.categoryName as string) || "").trim() || dict.sessionDetailsNoCategory;
  const machineLabel = ((item.resourceName as string) || "").trim() || dict.sessionDetailsMachinePlaceholder;

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
        <div className="p-6">
          <OrderLabelCard
            tone={item.status === "IN_PROGRESS" ? "active" : item.status === "COMPLETED" ? "done" : "planned"}
            orderNo={`#${item.workOrderId || item.id}`}
            title={(item.workerName as string) || null}
            orderedBy={(item.creatorName ?? item.workerName) ?? null}
            orderedByLabel={dict.orderedBy}
            mode={categoryLabel}
            machine={machineLabel}
            material={(item.materialName as string) || null}
            quantity={item.quantityTons ? `${item.quantityTons as string}${dict.tons}` : null}
            customer={
              `${(item.customerLastName as string) || ""} ${(item.customerFirstName as string) || ""}`.trim() || null
            }
            description={(item.taskDescription as string) || null}
            dateLabel={
              item.startTime
                ? formatUiDateOnly(item.startTime as string)
                : item.dueDate
                  ? formatUiDateOnly(item.dueDate as string)
                  : null
            }
            timeLabel={
              item.startTime
                ? `${formatUiTimeHm(item.startTime as string)}${
                    item.endTime ? ` – ${formatUiTimeHm(item.endTime as string)}` : ""
                  }`
                : item.dueDate
                  ? formatUiTimeHm(item.dueDate as string)
                  : null
            }
            className="mb-6"
            attachmentPhotos={Boolean(item.hasPhotos) || photos.length > 0}
            attachmentNotes={Boolean(item.hasNotes) || notes.length > 0}
          />
          {item._type === "ORDER" ? (
            <div className="py-12 text-center">
              <MapIcon className="mx-auto mb-4 h-12 w-12 text-zinc-300 dark:text-zinc-700" />
              <h3 className="font-medium text-zinc-900 dark:text-zinc-300">{dict.notStartedTitle}</h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-zinc-500">{dict.notStartedDesc}</p>
              {onEdit ? (
                <button
                  type="button"
                  onClick={() => onEdit(item)}
                  className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-6 py-2.5 font-semibold text-amber-700 transition hover:bg-amber-100 active:scale-95 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-500 dark:hover:bg-amber-500/20"
                >
                  {dict.sessionDetailsEditOrder}
                </button>
              ) : null}
            </div>
          ) : (
            <div className="space-y-6">
              {isLoading ? (
                <div className="py-12 text-center text-zinc-500">{dict.loadingData}</div>
              ) : (
                <>
                  <SessionMapSection
                    hasMapData={hasMapData}
                    isStationary={isStationary}
                    currentLocation={currentLocation}
                    pathTraveled={pathTraveled}
                    events={events}
                    dict={dict}
                  />

                  <SessionTimelinePanel
                    items={timelineItems}
                    allPhotos={allPhotos}
                    onPhotoClick={handlePhotoClick}
                    dict={dict}
                  />
                </>
              )}
            </div>
          )}
        </div>
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
