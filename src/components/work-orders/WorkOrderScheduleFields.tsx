"use client";

import { DecimalInput } from "@/components/DecimalInput";
import { DatetimeLocalInput } from "@/components/DatetimeLocalInput";
import { dateInputClassName } from "@/components/datetimeFieldStyles";

import { useEffect } from "react";
import { ScheduleConflictPanel } from "@/components/work-orders/ScheduleConflictPanel";
import type { ScheduleConflictLabels } from "@/components/work-orders/formatScheduleConflictLine";
import { useScheduleConflictPreview } from "@/components/work-orders/useScheduleConflictPreview";

const FIELD = "space-y-1.5";
const LABEL =
  "block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400";
export type WorkOrderScheduleFieldLabels = ScheduleConflictLabels & {
  expectedDurationLabel: string;
  expectedDurationPlaceholder: string;
  dueDateOptionalLabel: string;
  scheduleConflictTitle: string;
  scheduleConflictChecking: string;
  scheduleConflictMachineHint?: string;
  scheduleConflictWorkerBlockedHint?: string;
  createDespiteConflict?: string;
};

export function WorkOrderScheduleFields({
  mode,
  scope,
  userId,
  resourceId,
  dueDate,
  expectedDurationHours,
  onDueDateChange,
  onExpectedDurationHoursChange,
  excludeOrderId,
  previewEnabled = true,
  labels,
  onForceSave,
  isSubmitting = false,
  controlClassName,
  onPreviewChange,
}: {
  mode: "admin" | "worker";
  scope: "admin" | "worker";
  userId: string;
  resourceId: string;
  dueDate: string;
  expectedDurationHours: string;
  onDueDateChange: (value: string) => void;
  onExpectedDurationHoursChange: (value: string) => void;
  excludeOrderId?: number | null;
  previewEnabled?: boolean;
  labels: WorkOrderScheduleFieldLabels;
  onForceSave?: () => void;
  isSubmitting?: boolean;
  controlClassName?: string;
  onPreviewChange?: (state: {
    hasConflicts: boolean;
    status: "idle" | "loading" | "clear" | "conflicts" | "error";
  }) => void;
}) {
  const control = controlClassName ?? dateInputClassName(mode === "admin" ? "admin" : "worker");

  const schedulePreviewEnabled = Boolean(previewEnabled && userId && resourceId);

  const { status, conflicts, hasConflicts } = useScheduleConflictPreview({
    scope,
    enabled: schedulePreviewEnabled,
    userId,
    resourceId,
    dueDate,
    expectedDurationHours,
    excludeOrderId: excludeOrderId ?? null,
  });

  useEffect(() => {
    onPreviewChange?.({ hasConflicts, status });
  }, [hasConflicts, status, onPreviewChange]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className={FIELD}>
          <label className={LABEL}>{labels.expectedDurationLabel}</label>
          <DecimalInput
            placeholder={labels.expectedDurationPlaceholder}
            value={expectedDurationHours}
            onChange={onExpectedDurationHoursChange}
            className={control}
          />
        </div>
        <div className={FIELD}>
          <label className={LABEL}>{labels.dueDateOptionalLabel}</label>
          <DatetimeLocalInput
            variant={mode === "admin" ? "admin" : "worker"}
            value={dueDate}
            onChange={onDueDateChange}
            className={controlClassName ?? ""}
          />
        </div>
      </div>

      <ScheduleConflictPanel
        mode={mode}
        status={status}
        conflicts={conflicts}
        labels={labels}
        title={labels.scheduleConflictTitle}
        checkingLabel={labels.scheduleConflictChecking}
        machineHint={labels.scheduleConflictMachineHint}
        workerBlockedHint={labels.scheduleConflictWorkerBlockedHint}
        createDespiteLabel={labels.createDespiteConflict}
        onForceSave={mode === "admin" && hasConflicts ? onForceSave : undefined}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
