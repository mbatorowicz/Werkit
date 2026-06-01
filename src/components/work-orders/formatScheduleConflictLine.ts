import { formatDict, formatUiTimeHm } from "@/i18n/format";
import type { ScheduleConflictPreview } from "@/components/work-orders/useScheduleConflictPreview";

export type ScheduleConflictLabels = {
  scheduleConflictWorker: string;
  scheduleConflictResource: string;
  scheduleConflictSessionWorker: string;
  scheduleConflictSessionResource: string;
  scheduleConflictUnknownWorker: string;
  scheduleConflictUnknownResource: string;
  scheduleConflictNoTask: string;
};

function formatTimeRange(start: string, end: string): string {
  return `${formatUiTimeHm(start)}–${formatUiTimeHm(end)}`;
}

export function formatScheduleConflictLine(
  labels: ScheduleConflictLabels,
  conflict: ScheduleConflictPreview
): string {
  const timeRange = formatTimeRange(conflict.start, conflict.end);
  const task = conflict.taskLabel?.trim() || labels.scheduleConflictNoTask;
  const orderId = conflict.conflictingOrderId ?? conflict.conflictingId;

  if (conflict.source === "session") {
    if (conflict.kind === "worker") {
      return formatDict(labels.scheduleConflictSessionWorker, {
        workerName: conflict.workerName ?? labels.scheduleConflictUnknownWorker,
        start: formatUiTimeHm(conflict.start),
        end: formatUiTimeHm(conflict.end),
        sessionId: conflict.conflictingId,
        task,
      });
    }
    return formatDict(labels.scheduleConflictSessionResource, {
      resourceName: conflict.resourceName ?? labels.scheduleConflictUnknownResource,
      start: formatUiTimeHm(conflict.start),
      end: formatUiTimeHm(conflict.end),
      sessionId: conflict.conflictingId,
      task,
    });
  }

  if (conflict.kind === "worker") {
    return formatDict(labels.scheduleConflictWorker, {
      workerName: conflict.workerName ?? labels.scheduleConflictUnknownWorker,
      timeRange,
      orderId,
      task,
    });
  }

  return formatDict(labels.scheduleConflictResource, {
    resourceName: conflict.resourceName ?? labels.scheduleConflictUnknownResource,
    timeRange,
    orderId,
    task,
  });
}
