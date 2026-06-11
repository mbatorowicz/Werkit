"use client";

import { Play } from "lucide-react";
import { ScheduleConflictPanel } from "@/components/work-orders/ScheduleConflictPanel";
import {
  buildScheduleConflictLabels,
  buildWorkOrderScheduleFieldLabels,
  toDatetimeLocalValue,
} from "@/components/work-orders/scheduleConflictI18n";
import { useScheduleConflictPreview } from "@/components/work-orders/useScheduleConflictPreview";
import { useAppDialog, appDialogApiMessage } from "@/components/AppDialogProvider";
import { fetchWithDeviceTelemetry } from "@/lib/fetchWithDeviceTelemetry";
import { parseJsonUnknown, readApiErrorString } from "@/lib/parseApiJson";
import { workOrderPendingListCardClass } from "@/features/worker/lib/workOrderPresentation";
import { WorkOrderPriorityRibbon } from "@/components/work-orders";
import { workOrderOrderLabelCardFields } from "@/lib/orderLabelFieldVisibility";
import { OrderLabelCard } from "@/components/work-orders/OrderLabelCard";
import { WorkOrderOwnOrderActions } from "@/components/work-orders/WorkOrderOwnOrderActions";
import { formatUiDateOnly, formatUiTimeHm, useAppLocale, useDictionary } from "@/i18n";
import type { AppDictionary } from "@/i18n/types";
import type { WorkOrder } from "@/types/worker";
import { useWorkerOrderDetailsModal } from "@/features/worker/hooks/useWorkerOrderDetailsModal";
import { workerOrderDetailsFromWorkOrder } from "@/features/worker/lib/workerOrderDetails";
import { UI_RADIUS_CONTROL } from "@/lib/uiRadius";
import { BTN_PRIMARY } from "@/lib/uiButtons";
import { cn } from "@/lib/cn";

type WorkerDict = AppDictionary["worker"]["client"];

interface WorkOrderPendingCardProps {
  order: WorkOrder;
  dict: WorkerDict;
  mode: "start" | "preview";
  onStart?: (orderId: number) => void;
  acceptError?: string | null;
  positionLabel?: string;
  density?: "normal" | "compact";
  currentUserId?: number | null;
  onOrderDeleted?: () => void;
}

function conflictPreviewArgs(order: WorkOrder) {
  return {
    userId: order.userId != null ? String(order.userId) : "",
    resourceId: order.resourceId != null ? String(order.resourceId) : "",
    dueDate: toDatetimeLocalValue(order.dueDate),
    expectedDurationHours:
      order.expectedDurationHours != null && order.expectedDurationHours > 0
        ? String(order.expectedDurationHours)
        : "",
  };
}

function isOwnPendingOrder(
  mode: "start" | "preview",
  currentUserId: number | null | undefined,
  order: WorkOrder
): boolean {
  return (
    mode === "start" &&
    currentUserId != null &&
    order.createdById != null &&
    order.createdById === currentUserId
  );
}

function pendingCardDateTime(order: WorkOrder) {
  return order.dueDate
    ? { dateLabel: formatUiDateOnly(order.dueDate), timeLabel: formatUiTimeHm(order.dueDate) }
    : { dateLabel: formatUiDateOnly(order.createdAt), timeLabel: formatUiTimeHm(order.createdAt) };
}

export function WorkOrderPendingCard({
  order,
  dict,
  mode,
  onStart,
  acceptError,
  positionLabel,
  density = "normal",
  currentUserId,
  onOrderDeleted,
}: WorkOrderPendingCardProps) {
  const { alert: appAlert, confirm: appConfirm } = useAppDialog();
  const { openOrderDetails, orderDetailsModal } = useWorkerOrderDetailsModal();
  const dictionary = useDictionary();
  const locale = useAppLocale();
  const apiErrors = dictionary.apiErrors as Record<string, string>;
  const scheduleDict = dictionary.workOrdersSchedule;
  const scheduleLabels = buildWorkOrderScheduleFieldLabels(scheduleDict, { mode: "worker" });
  const conflictLabels = buildScheduleConflictLabels(scheduleDict);

  const preview = conflictPreviewArgs(order);

  const { status, conflicts, hasConflicts } = useScheduleConflictPreview({
    scope: "worker",
    enabled: Boolean(preview.userId && preview.resourceId),
    userId: preview.userId,
    resourceId: preview.resourceId,
    dueDate: preview.dueDate,
    expectedDurationHours: preview.expectedDurationHours,
    excludeOrderId: order.id,
  });

  const blocked = mode === "start" && (hasConflicts || Boolean(acceptError));
  const tonsSuffix = scheduleDict.tons;
  const labelFields = workOrderOrderLabelCardFields(order, tonsSuffix, locale);
  const orderDetails = () => workerOrderDetailsFromWorkOrder(order, tonsSuffix, locale);

  const isOwnOrder = isOwnPendingOrder(mode, currentUserId, order);
  const { dateLabel, timeLabel } = pendingCardDateTime(order);

  const handleDelete = async () => {
    if (!(await appConfirm({ message: dict.deleteOwnOrderConfirm, variant: "danger" }))) {
      return;
    }
    try {
      const res = await fetchWithDeviceTelemetry(
        `Worker: delete own order ${order.id}`,
        `/api/worker/work-orders/${order.id}`,
        { method: "DELETE" },
        { category: "orders" }
      );
      if (!res.ok) {
        const body = await parseJsonUnknown(res);
        const code = readApiErrorString(body);
        await appAlert({ message: appDialogApiMessage(apiErrors, code, apiErrors.delete_error) });
        return;
      }
      await appAlert({ message: dict.editOrderDeleted });
      onOrderDeleted?.();
    } catch {
      await appAlert({ message: dict.errNetwork });
    }
  };

  return (
    <>
      <div className={workOrderPendingListCardClass(order.priority)}>
        {positionLabel ? (
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
              {positionLabel}
            </span>
            <WorkOrderPriorityRibbon priority={order.priority} labels={dict} />
          </div>
        ) : null}

        <OrderLabelCard
          tone="planned"
          layout="teaser"
          density={density}
          orderNo={`#${order.id}`}
          onCardClick={() => openOrderDetails(orderDetails())}
          cardAriaLabel={dict.orderDetailsOpenCategory}
          mode={labelFields.mode || dict.noCategoryName}
          modeColor={labelFields.modeColor}
          machine={labelFields.machine}
          material={labelFields.material}
          quantity={labelFields.quantity}
          customer={labelFields.customer}
          description={labelFields.description}
          fieldVisibility={labelFields.fieldVisibility}
          badges={
            !positionLabel ? (
              <WorkOrderPriorityRibbon priority={order.priority} labels={dict} />
            ) : undefined
          }
          orderedBy={order.creatorName ?? null}
          orderedByLabel={dict.orderedBy}
          dateLabel={dateLabel}
          timeLabel={timeLabel}
          className="bg-white/60 dark:bg-zinc-950/30"
          attachmentPhotos={Boolean(order.hasPhotos)}
          attachmentNotes={Boolean(order.hasNotes)}
        />

        <ScheduleConflictPanel
          mode="worker"
          status={status}
          conflicts={conflicts}
          labels={conflictLabels}
          title={scheduleLabels.scheduleConflictTitle}
          checkingLabel={scheduleLabels.scheduleConflictChecking}
          workerBlockedHint={scheduleLabels.scheduleConflictWorkerBlockedHint}
        />

        {acceptError ? (
          <p className="text-xs font-medium text-red-700 dark:text-red-400">{acceptError}</p>
        ) : null}

        {isOwnOrder ? (
          <WorkOrderOwnOrderActions
            orderId={order.id}
            editLabel={dict.editOrder}
            deleteLabel={dict.deleteOrder}
            onDelete={() => void handleDelete()}
          />
        ) : null}

        {mode === "start" && !blocked && onStart ? (
          <button
            type="button"
            onClick={() => onStart(order.id)}
            className={cn(
              BTN_PRIMARY,
              UI_RADIUS_CONTROL,
              "py-3 px-4 flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm w-full"
            )}
          >
            <Play className="w-4 h-4 fill-current" />
            <span className="text-sm font-bold uppercase tracking-wider">{dict.startTask}</span>
          </button>
        ) : null}
      </div>
      {orderDetailsModal}
    </>
  );
}
