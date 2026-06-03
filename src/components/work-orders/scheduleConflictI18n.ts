import type { AppDictionary } from "@/i18n/types";
import { snapDatetimeLocalValue } from "@/lib/datetimeLocal";
import type { ScheduleConflictLabels } from "@/components/work-orders/formatScheduleConflictLine";
import type { WorkOrderScheduleFieldLabels } from "@/components/work-orders/WorkOrderScheduleFields";

type ScheduleDict = AppDictionary["workOrdersSchedule"];

export function buildScheduleConflictLabels(dict: ScheduleDict): ScheduleConflictLabels {
  const c = dict.conflict;
  return {
    scheduleConflictWorker: c.worker,
    scheduleConflictResource: c.resource,
    scheduleConflictSessionWorker: c.sessionWorker,
    scheduleConflictSessionResource: c.sessionResource,
    scheduleConflictUnknownWorker: c.unknownWorker,
    scheduleConflictUnknownResource: c.unknownResource,
    scheduleConflictNoTask: c.noTask,
  };
}

export function buildWorkOrderScheduleFieldLabels(
  dict: ScheduleDict,
  options?: { mode?: "admin" | "worker" }
): WorkOrderScheduleFieldLabels {
  const c = dict.conflict;
  const mode = options?.mode ?? "admin";
  return {
    ...buildScheduleConflictLabels(dict),
    expectedDurationLabel: dict.expectedDurationLabel,
    expectedDurationPlaceholder: dict.expectedDurationPlaceholder,
    dueDateOptionalLabel: dict.dueDateOptionalLabel,
    scheduleConflictTitle: c.title,
    scheduleConflictChecking: c.checking,
    scheduleConflictMachineHint: mode === "admin" ? c.machineHint : undefined,
    scheduleConflictWorkerBlockedHint: mode === "worker" ? c.workerBlockedHint : undefined,
    createDespiteConflict: mode === "admin" ? c.createDespite : undefined,
  };
}

export function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  const raw = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return snapDatetimeLocalValue(raw);
}
