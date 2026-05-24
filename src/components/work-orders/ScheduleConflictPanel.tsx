"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import {
  formatScheduleConflictLine,
  type ScheduleConflictLabels,
} from "@/components/work-orders/formatScheduleConflictLine";
import type { ScheduleConflictPreview } from "@/features/admin/orders/useScheduleConflictPreview";

type PreviewStatus = "idle" | "loading" | "clear" | "conflicts" | "error";

export function ScheduleConflictPanel({
  mode,
  status,
  conflicts,
  labels,
  title,
  checkingLabel,
  machineHint,
  workerBlockedHint,
  createDespiteLabel,
  onForceSave,
  isSubmitting = false,
}: {
  mode: "admin" | "worker";
  status: PreviewStatus;
  conflicts: ScheduleConflictPreview[];
  labels: ScheduleConflictLabels;
  title: string;
  checkingLabel: string;
  machineHint?: string;
  workerBlockedHint?: string;
  createDespiteLabel?: string;
  onForceSave?: () => void;
  isSubmitting?: boolean;
}) {
  const hasConflicts = conflicts.length > 0;

  if (status === "loading") {
    return <p className="text-xs text-zinc-500 dark:text-zinc-400">{checkingLabel}</p>;
  }

  if (!hasConflicts) return null;

  return (
    <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-500/30 dark:bg-amber-500/10">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
        <div className="space-y-2 text-sm text-amber-950 dark:text-amber-100">
          <p className="font-semibold">{title}</p>
          <ul className="list-disc space-y-1 pl-4">
            {conflicts.map((c) => (
              <li key={`${c.kind}-${c.source}-${c.conflictingId}`}>
                {formatScheduleConflictLine(labels, c)}
              </li>
            ))}
          </ul>
          {mode === "admin" && machineHint ? (
            <p className="text-xs font-medium text-amber-900/90 dark:text-amber-200/90">{machineHint}</p>
          ) : null}
          {mode === "worker" && workerBlockedHint ? (
            <p className="text-xs font-medium text-amber-900/90 dark:text-amber-200/90">{workerBlockedHint}</p>
          ) : null}
          {mode === "admin" && onForceSave && createDespiteLabel ? (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onForceSave}
              className="mt-1 w-full rounded-lg border border-amber-400 bg-amber-100 px-4 py-2.5 text-sm font-bold text-amber-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50 dark:border-amber-500/40 dark:bg-amber-500/20 dark:text-amber-100 dark:hover:bg-amber-500/30 sm:w-auto"
            >
              {isSubmitting ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : createDespiteLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
