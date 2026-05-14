"use client";

import { TimelineItem } from "@/types/worker";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  X,
  Map as MapIcon,
  Image as ImageIcon,
  FileText,
  Loader2,
  CheckCircle2,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { getDictionary, type Locale } from "@/i18n";
import { formatDict } from "@/i18n/format";
import { DEFAULT_UI_LOCALE } from "@/i18n/constants";
import { OrderLabelCard } from "@/components/work-orders/OrderLabelCard";
import { AdminModalShell } from "@/components/Admin/AdminModalShell";
import { UnifiedGanttItem } from "@/types/admin";
import { foldMicroJumpsInPath } from "@/lib/gpsPathMicroJumps";

const timeHM: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" };

function formatUiDate(value: string | number | Date): string {
  return new Date(value).toLocaleDateString(DEFAULT_UI_LOCALE);
}

function formatUiTime(value: string | number | Date): string {
  return new Date(value).toLocaleTimeString(DEFAULT_UI_LOCALE, timeHM);
}

const SessionDetailsLocaleContext = createContext<Locale>("pl");

/** next/dynamic nie przekazuje propsów do `loading` — locale ze kontekstu jak w rodzicu. */
function SessionMapLoader() {
  const locale = useContext(SessionDetailsLocaleContext);
  const ordersDict = getDictionary(locale).admin.orders;
  return (
    <div
      role="status"
      aria-label={ordersDict.sessionMapLoadingLabel}
      className="flex h-full w-full animate-pulse items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800"
    >
      <MapIcon className="h-8 w-8 text-zinc-400" />
    </div>
  );
}

const LiveMap = dynamic(() => import("@/components/Map/LiveMap"), {
  ssr: false,
  loading: SessionMapLoader,
});

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
  onDeleteArchivedSession?: (sessionId: number) => Promise<void>;
  /** Domyślnie PL; w przyszłości z cookies / profilem (jak `getDictionary` w layoutach). */
  locale?: Locale;
}) {
  const resolvedLocale = locale ?? "pl";
  const dictionary = useMemo(() => getDictionary(resolvedLocale), [resolvedLocale]);
  const dict = dictionary.admin.orders;
  const adminUi = dictionary.admin.ui;

  const [logs, setLogs] = useState<{ latitude?: string; longitude?: string }[]>([]);
  const [photos, setPhotos] = useState<
    { id?: number; latitude?: string | null; longitude?: string | null; photoUrl?: string; photoType?: string; createdAt?: string }[]
  >([]);
  const [notes, setNotes] = useState<
    { id?: number; latitude?: string | null; longitude?: string | null; note?: string; createdAt?: string }[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionBusy, setActionBusy] = useState<null | "complete" | "delete">(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    if (item._type !== "SESSION") return;
    let cancelled = false;
    const run = async () => {
      setIsLoading(true);
      try {
        const r = await fetch(`/api/admin/work-sessions/${item.id}`);
        const data = (await r.json()) as {
          logs?: { latitude?: string; longitude?: string }[];
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

  const pathTraveled = foldMicroJumpsInPath(
    logs
      .filter(
        (l): l is { latitude: string; longitude: string } =>
          typeof l.latitude === "string" &&
          typeof l.longitude === "string" &&
          l.latitude !== "" &&
          l.longitude !== "",
      )
      .map((l) => ({ lat: parseFloat(l.latitude), lng: parseFloat(l.longitude) }))
      .reverse(),
  );
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
            if (!dict.forceCompleteConfirm || !confirm(dict.forceCompleteConfirm)) return;
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
          onClick={async () => {
            if (!dict.deleteArchivedConfirm || !confirm(dict.deleteArchivedConfirm)) return;
            setActionBusy("delete");
            try {
              await onDeleteArchivedSession(item.id);
            } catch {
              /* alert po stronie rodzica */
            } finally {
              setActionBusy(null);
            }
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
                ? formatUiDate(item.startTime as string)
                : item.dueDate
                  ? formatUiDate(item.dueDate as string)
                  : null
            }
            timeLabel={
              item.startTime
                ? `${formatUiTime(item.startTime as string)}${
                    item.endTime ? ` – ${formatUiTime(item.endTime as string)}` : ""
                  }`
                : item.dueDate
                  ? formatUiTime(item.dueDate as string)
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
                  {!isStationary ? (
                    <div className="h-[400px] overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
                      {hasMapData ? (
                        <LiveMap
                          currentLocation={currentLocation}
                          pathTraveled={pathTraveled}
                          destination={null}
                          events={events}
                        />
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center bg-zinc-50 text-zinc-500 dark:bg-zinc-800/50">
                          <MapIcon className="mb-2 h-8 w-8 opacity-50" />
                          <p>{dict.noGpsData}</p>
                        </div>
                      )}
                    </div>
                  ) : null}

                  {timelineItems.length > 0 ? (
                    <div className="mt-8">
                      <h3 className="mb-6 flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-white">
                        <ImageIcon className="h-5 w-5 text-amber-500" /> {dict.timelineTitle}
                      </h3>
                      <div className="relative ml-4 space-y-8 border-l-2 border-zinc-200 dark:border-zinc-800">
                        {timelineItems.map((entry) => {
                          const isNote = entry.type === "note";
                          const timeStr = formatUiTime(entry.time);
                          const dateStr = formatUiDate(entry.time);

                          return (
                            <div key={`${entry.type}-${entry.id}`} className="relative flex w-full items-start">
                              <div className="absolute -left-[9px] top-4 z-10 h-4 w-4 rounded-full border-4 border-zinc-50 bg-amber-500 dark:border-[#0a0a0b]" />

                              <div className="w-full pl-6">
                                <div className="max-w-2xl rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
                                  <div className="mb-2 flex items-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                                    {isNote ? (
                                      <FileText className="h-4 w-4 text-orange-500" />
                                    ) : (
                                      <ImageIcon className="h-4 w-4 text-purple-500" />
                                    )}
                                    {dateStr} {timeStr}
                                  </div>
                                  {isNote ? (
                                    <p className="whitespace-pre-wrap text-sm text-zinc-900 dark:text-zinc-200">{entry.note ?? ""}</p>
                                  ) : (
                                    <>
                                      <Image
                                        src={entry.photoUrl ?? ""}
                                        alt={dict.photoRoute}
                                        width={800}
                                        height={600}
                                        unoptimized
                                        className="mb-2 h-auto w-full cursor-pointer rounded-md object-cover transition-opacity hover:opacity-90"
                                        onClick={() => {
                                          const url = entry.photoUrl;
                                          if (!url) return;
                                          setLightboxIndex(allPhotos.indexOf(url));
                                        }}
                                      />
                                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-200">
                                        {entry.photoType === "START"
                                          ? dict.photoStart
                                          : entry.photoType === "END"
                                            ? dict.photoEnd
                                            : dict.photoRoute}
                                      </p>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          )}
        </div>
      </AdminModalShell>

      {lightboxIndex !== null ? (
        <div className="fixed inset-0 z-[200] flex flex-col bg-black/95 backdrop-blur-md">
          <div className="z-10 flex items-center justify-between p-4 text-white/50">
            <div className="text-sm font-medium tracking-widest">
              {formatDict(dict.lightboxCounter, { current: lightboxIndex + 1, total: allPhotos.length })}
            </div>
            <button
              type="button"
              onClick={() => setLightboxIndex(null)}
              className="rounded-full p-2 transition hover:bg-white/10 hover:text-white"
              aria-label={adminUi.closeModal}
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="relative flex flex-1 items-center justify-center overflow-hidden px-12">
            <Image
              src={allPhotos[lightboxIndex] ?? ""}
              alt={dict.enlargedPhoto}
              width={1200}
              height={900}
              unoptimized
              className="max-h-full max-w-full animate-in fade-in zoom-in-95 object-contain shadow-2xl duration-300"
            />

            {allPhotos.length > 1 ? (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxIndex((prev) => (prev! > 0 ? prev! - 1 : allPhotos.length - 1));
                  }}
                  className="absolute left-4 top-1/2 flex -translate-y-1/2 rounded-full bg-white/10 p-3 text-white backdrop-blur-md transition hover:bg-white/20"
                  aria-label={dict.lightboxPrevPhoto}
                >
                  <ChevronLeft className="h-6 w-6" strokeWidth={2} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxIndex((prev) => (prev! < allPhotos.length - 1 ? prev! + 1 : 0));
                  }}
                  className="absolute right-4 top-1/2 flex -translate-y-1/2 rounded-full bg-white/10 p-3 text-white backdrop-blur-md transition hover:bg-white/20"
                  aria-label={dict.lightboxNextPhoto}
                >
                  <ChevronRight className="h-6 w-6" strokeWidth={2} />
                </button>
              </>
            ) : null}
          </div>

          <div className="z-10 flex h-24 items-center justify-center gap-2 overflow-x-auto bg-black/50 p-4 custom-scrollbar">
            {allPhotos.map((url, idx) => (
              <Image
                key={url}
                src={url}
                alt={formatDict(dict.lightboxThumbnailAlt, { n: idx + 1 })}
                width={64}
                height={64}
                unoptimized
                className={`h-16 w-16 cursor-pointer rounded object-cover transition-all ${
                  idx === lightboxIndex ? "scale-110 border-2 border-amber-500 opacity-100" : "opacity-40 hover:opacity-100"
                }`}
                onClick={() => setLightboxIndex(idx)}
              />
            ))}
          </div>
        </div>
      ) : null}
    </>
    </SessionDetailsLocaleContext.Provider>
  );
}
