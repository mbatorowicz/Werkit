"use client";

import { useAppLocale } from "@/i18n";
import { WorkOrderPriorityRibbon } from "@/components/work-orders";
import { normalizeWorkOrderPriority } from "@/features/worker/lib/workOrderPriority";
import { OrderLabelCard } from "@/components/work-orders/OrderLabelCard";
import type { AppDictionary } from "@/i18n/types";
import type { UnifiedGanttItem } from "@/types/admin";
import {
  buildDispatchItemCardCopy,
  dispatchItemDateTimeLabels,
  dispatchStatusTone,
  type DispatchItemCardLayout,
} from "@/features/admin/orders/dispatchTableUi";

type OrdersDict = AppDictionary["admin"]["orders"];
type WorkerClient = AppDictionary["worker"]["client"];

export function OrdersDispatchItemCard({
  item,
  layout,
  liveClockMs,
  ordersDict,
  workerUiLabels,
  onOpenDetails,
}: {
  item: UnifiedGanttItem;
  layout: DispatchItemCardLayout;
  liveClockMs: number | null;
  ordersDict: OrdersDict;
  workerUiLabels: WorkerClient;
  /** Klik w kartę — podgląd sesji/zlecenia (tablica i tabela). */
  onOpenDetails?: () => void;
}) {
  const locale = useAppLocale();
  const dict = ordersDict;
  const tone = dispatchStatusTone(item.status);
  const {
    orderNo,
    mode,
    modeColor,
    machine,
    material,
    qty,
    customerDisplay,
    desc,
    fieldVisibility,
  } = buildDispatchItemCardCopy(item, dict, workerUiLabels, locale);
  const { dateLabel, timeLabel } = dispatchItemDateTimeLabels(item, layout, liveClockMs);

  const showOrderPriority = layout !== "boardDone" && item._type === "ORDER";

  const badges = showOrderPriority ? (
    <WorkOrderPriorityRibbon
      priority={normalizeWorkOrderPriority(item.priority ?? undefined)}
      labels={workerUiLabels}
    />
  ) : null;

  return (
    <OrderLabelCard
      density="compact"
      layout="teaser"
      tone={tone}
      orderNo={orderNo}
      title={item.workerName as string}
      orderedBy={null}
      orderedByLabel={dict.orderedBy}
      attachmentPhotos={Boolean(item.hasPhotos)}
      attachmentNotes={Boolean(item.hasNotes)}
      badges={badges}
      showDateTime
      mode={mode}
      modeColor={modeColor}
      machine={machine}
      material={material || "—"}
      quantity={qty || "—"}
      customerDisplay={customerDisplay}
      description={desc || "—"}
      fieldVisibility={fieldVisibility}
      dateLabel={dateLabel}
      timeLabel={timeLabel || "—"}
      onCardClick={onOpenDetails}
      cardAriaLabel={workerUiLabels.orderDetailsOpenCategory}
    />
  );
}
