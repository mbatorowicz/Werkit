"use client";

import { Loader2, CheckCircle2, Trash2 } from "lucide-react";

interface SessionDetailsFooterProps {
  showSessionFooter: boolean;
  status: string | undefined;
  actionBusy: null | "complete" | "delete";
  onForceComplete?: () => void;
  onDeleteArchived?: () => void;
  dict: {
    forceCompleteLabel: string;
    deleteArchivedLabel: string;
  };
}

export function SessionDetailsFooter({
  showSessionFooter,
  status,
  actionBusy,
  onForceComplete,
  onDeleteArchived,
  dict,
}: SessionDetailsFooterProps) {
  if (!showSessionFooter) return undefined;

  return (
    <>
      {status === "IN_PROGRESS" && onForceComplete ? (
        <button
          type="button"
          disabled={actionBusy !== null}
          onClick={onForceComplete}
          className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
        >
          {actionBusy === "complete" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          {dict.forceCompleteLabel}
        </button>
      ) : null}
      {status === "COMPLETED" && onDeleteArchived ? (
        <button
          type="button"
          disabled={actionBusy !== null}
          onClick={onDeleteArchived}
          className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-500/15 disabled:opacity-50 dark:border-red-500/25 dark:text-red-400"
        >
          {actionBusy === "delete" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          {dict.deleteArchivedLabel}
        </button>
      ) : null}
    </>
  );
}
