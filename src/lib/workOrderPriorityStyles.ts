import { normalizeWorkOrderPriority } from "@/features/worker/lib/workOrderPriority";
import type { WorkOrderPriority } from "@/types/worker";

export type WorkOrderPriorityLabels = {
  priorityUrgent: string;
  priorityImportant: string;
  priorityNormal: string;
  priorityLow: string;
};

/** Średnica kropki priorytetu (px). */
export const WORK_ORDER_PRIORITY_DOT_PX = 5;

/** SSOT kolorów kropki priorytetu (worker + admin). */
export const WORK_ORDER_PRIORITY_DOT_CLASS: Record<WorkOrderPriority, string> = {
  URGENT: "bg-red-500",
  HIGH: "bg-orange-500",
  NORMAL: "bg-zinc-400 dark:bg-zinc-500",
  LOW: "bg-emerald-500",
};

export function workOrderPriorityLabel(
  priority: WorkOrderPriority | null | undefined,
  labels: WorkOrderPriorityLabels
): string {
  const p = normalizeWorkOrderPriority(priority) ?? "NORMAL";
  switch (p) {
    case "URGENT":
      return labels.priorityUrgent;
    case "HIGH":
      return labels.priorityImportant;
    case "LOW":
      return labels.priorityLow;
    default:
      return labels.priorityNormal;
  }
}

export function workOrderPriorityDotClassName(
  priority: WorkOrderPriority | null | undefined
): string {
  const p = normalizeWorkOrderPriority(priority) ?? "NORMAL";
  const pulse = p === "URGENT" ? "animate-pulse" : "";
  return `${WORK_ORDER_PRIORITY_DOT_CLASS[p]} ${pulse}`.trim();
}
