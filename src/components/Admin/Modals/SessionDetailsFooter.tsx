"use client";

import { Loader2, CheckCircle2, Trash2 } from "lucide-react";
import { UiButton } from "@/components/UiButton";

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
        <UiButton
          type="button"
          variant="primary"
          disabled={actionBusy !== null}
          onClick={onForceComplete}
        >
          {actionBusy === "complete" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          {dict.forceCompleteLabel}
        </UiButton>
      ) : null}
      {status === "COMPLETED" && onDeleteArchived ? (
        <UiButton
          type="button"
          variant="dangerSoft"
          disabled={actionBusy !== null}
          onClick={onDeleteArchived}
        >
          {actionBusy === "delete" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
          {dict.deleteArchivedLabel}
        </UiButton>
      ) : null}
    </>
  );
}
