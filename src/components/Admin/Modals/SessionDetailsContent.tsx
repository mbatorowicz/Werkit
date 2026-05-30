"use client";

import { Map as MapIcon } from "lucide-react";
import type { TimelineItem } from "@/types/worker";
import { OrderLabelCard } from "@/components/work-orders/OrderLabelCard";
import { formatUiDateOnly, formatUiTimeHm } from "@/i18n/format";
import type { UnifiedGanttItem } from "@/types/admin";
import SessionMapSection from "./SessionMapSection";
import SessionTimelinePanel from "./SessionTimelinePanel";

interface SessionDetailsContentProps {
  item: UnifiedGanttItem;
  isLoading: boolean;
  hasMapData: boolean;
  isStationary: boolean;
  currentLocation: { lat: number; lng: number };
  pathTraveled: { lat: number; lng: number }[];
  events: TimelineItem[];
  timelineItems: Array<{
    id?: number;
    photoUrl?: string;
    note?: string;
    createdAt?: string;
    type: "photo" | "note";
    time: number;
  }>;
  allPhotos: string[];
  onPhotoClick: (url: string) => void;
  onEdit?: (item: UnifiedGanttItem) => void;
  dict: {
    sessionDetailsNoCategory: string;
    sessionDetailsMachinePlaceholder: string;
    notStartedTitle: string;
    notStartedDesc: string;
    sessionDetailsEditOrder: string;
    loadingData: string;
    orderedBy: string;
    tons: string;
    noGpsData: string;
    timelineTitle: string;
    photoRoute: string;
    photoStart: string;
    photoEnd: string;
  };
}

export function SessionDetailsContent({
  item,
  isLoading,
  hasMapData,
  isStationary,
  currentLocation,
  pathTraveled,
  events,
  timelineItems,
  allPhotos,
  onPhotoClick,
  onEdit,
  dict,
}: SessionDetailsContentProps) {
  const categoryLabel = ((item.categoryName as string) || "").trim() || dict.sessionDetailsNoCategory;
  const machineLabel = ((item.resourceName as string) || "").trim() || dict.sessionDetailsMachinePlaceholder;

  return (
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
        attachmentPhotos={Boolean(item.hasPhotos) || allPhotos.length > 0}
        attachmentNotes={Boolean(item.hasNotes)}
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
                onPhotoClick={onPhotoClick}
                dict={dict}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
