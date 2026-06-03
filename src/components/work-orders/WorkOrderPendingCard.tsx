"use client";

import { Pencil, Play, Trash2 } from "lucide-react";
import Link from "next/link";
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
import { formatUiDateOnly, formatUiTimeHm, getDictionary } from "@/i18n";
import type { AppDictionary } from "@/i18n/types";
import type { WorkOrder } from "@/types/worker";
import { useWorkerOrderDetailsModal } from "@/features/worker/hooks/useWorkerOrderDetailsModal";
import { workerOrderDetailsFromWorkOrder } from "@/features/worker/lib/workerOrderDetails";
import { UI_RADIUS_CONTROL } from "@/lib/uiRadius";

type WorkerDict = AppDictionary["worker"]["client"];

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
}: {
  order: WorkOrder;
  dict: WorkerDict;
  mode: "start" | "preview";
  onStart?: (orderId: number) => void;
  acceptError?: string | null;
  positionLabel?: string;
  density?: "normal" | "compact";
  currentUserId?: number | null;
  onOrderDeleted?: () => void;
}) {
  const { alert: appAlert, confirm: appConfirm } = useAppDialog();
  const { openOrderDetails, orderDetailsModal } = useWorkerOrderDetailsModal();
  const apiErrors = getDictionary().apiErrors as Record<string, string>;
  const scheduleDict = getDictionary().workOrdersSchedule;
  const scheduleLabels = buildWorkOrderScheduleFieldLabels(scheduleDict, { mode: "worker" });
  const conflictLabels = buildScheduleConflictLabels(scheduleDict);

  const userId = order.userId != null ? String(order.userId) : "";
  const resourceId = order.resourceId != null ? String(order.resourceId) : "";
  const dueDate = toDatetimeLocalValue(order.dueDate);
  const expectedDurationHours =
    order.expectedDurationHours != null && order.expectedDurationHours > 0
      ? String(order.expectedDurationHours)
      : "";

  const { status, conflicts, hasConflicts } = useScheduleConflictPreview({
    scope: "worker",
    enabled: Boolean(userId && resourceId),
    userId,
    resourceId,
    dueDate,
    expectedDurationHours,
    excludeOrderId: order.id,
  });

  const blocked = mode === "start" && (hasConflicts || Boolean(acceptError));
  const tonsSuffix = scheduleDict.tons;
  const labelFields = workOrderOrderLabelCardFields(order, tonsSuffix);
  const orderDetails = () => workerOrderDetailsFromWorkOrder(order, tonsSuffix);

  const isOwnOrder =
    mode === "start" &&
    currentUserId != null &&
    order.createdById != null &&
    order.createdById === currentUserId;

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
        dateLabel={
          order.dueDate ? formatUiDateOnly(order.dueDate) : formatUiDateOnly(order.createdAt)
        }
        timeLabel={
          order.dueDate ? formatUiTimeHm(order.dueDate) : formatUiTimeHm(order.createdAt)
        }
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
        <div className="flex gap-2">
          <Link
            href={`/worker/orders/${order.id}/edit`}
            className={`flex-1 ${UI_RADIUS_CONTROL} border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 py-2.5 px-3 flex items-center justify-center gap-2 text-sm font-semibold text-zinc-800 dark:text-zinc-200 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800`}
          >
            <Pencil className="w-4 h-4" />
            {dict.editOrder}
          </Link>
          <button
            type="button"
            onClick={() => void handleDelete()}
            className={`${UI_RADIUS_CONTROL} border border-red-300 dark:border-red-500/40 bg-red-50 dark:bg-red-500/10 py-2.5 px-3 flex items-center justify-center gap-2 text-sm font-semibold text-red-800 dark:text-red-300 transition-colors hover:bg-red-100 dark:hover:bg-red-500/20`}
            title={dict.deleteOrder}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ) : null}

      {mode === "start" && !blocked && onStart ? (
        <button
          type="button"
          onClick={() => onStart(order.id)}
          className={`bg-amber-600 hover:bg-amber-500 text-white ${UI_RADIUS_CONTROL} py-3 px-4 flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm w-full`}
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
