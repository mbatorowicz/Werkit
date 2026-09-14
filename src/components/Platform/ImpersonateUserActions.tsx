"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { formatDict } from "@/i18n";
import type { AppDictionary } from "@/i18n/types";
import { useAppDialog, appDialogApiMessage } from "@/components/AppDialogProvider";
import { cn } from "@/lib/cn";
import { IMPERSONATION_REASON_MAX_LENGTH } from "@/lib/impersonationGuard";
import { INPUT_BASE } from "@/lib/uiTokens";
import { BTN_PRIMARY_COMPACT_SM, BTN_SECONDARY_SM } from "@/lib/uiButtons";
import type { PlatformTenantUserRow } from "@/services/PlatformTenantUserService";

type Dict = AppDictionary["platform"];

type Props = {
  companyId: number;
  companyActive: boolean;
  user: PlatformTenantUserRow;
  dict: Dict;
  apiErrors: Record<string, string>;
  onStatusMessage: (text: string, error: boolean) => void;
};

export function ImpersonateUserActions({
  companyId,
  companyActive,
  user,
  dict,
  apiErrors,
  onStatusMessage,
}: Props) {
  const { confirm: appConfirm } = useAppDialog();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);

  if (!user.isActive || !companyActive) return null;

  const asAdmin = user.role === "admin";
  const startLabel = asAdmin ? dict.impersonateAsAdmin : dict.impersonateAsViewer;

  async function startImpersonation() {
    const firstOk = await appConfirm({
      message: formatDict(asAdmin ? dict.impersonateConfirmAdmin : dict.impersonateConfirmViewer, {
        name: user.fullName,
      }),
      variant: asAdmin ? "danger" : "default",
    });
    if (!firstOk) return;

    if (asAdmin) {
      const secondOk = await appConfirm({
        message: formatDict(dict.impersonateConfirmAdminDanger, { name: user.fullName }),
        variant: "danger",
      });
      if (!secondOk) return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/platform/impersonation", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          targetUserId: user.id,
          reason: reason.trim() || undefined,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        onStatusMessage(appDialogApiMessage(apiErrors, body.error, dict.impersonateError), true);
        return;
      }
      window.location.assign("/admin");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex w-full min-w-[12rem] flex-col items-end gap-2">
      <button
        type="button"
        onClick={() => {
          setOpen((current) => !current);
          setReason("");
        }}
        className={asAdmin ? BTN_PRIMARY_COMPACT_SM : BTN_SECONDARY_SM}
      >
        {startLabel}
      </button>
      {open && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void startImpersonation();
          }}
          className="flex w-full flex-col gap-2"
        >
          <label className="block text-xs">
            <span className="text-zinc-500 dark:text-zinc-400">{dict.impersonateReason}</span>
            <input
              type="text"
              maxLength={IMPERSONATION_REASON_MAX_LENGTH}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={dict.impersonateReasonPlaceholder}
              className={cn(INPUT_BASE, "mt-1")}
            />
          </label>
          <button type="submit" disabled={pending} className={BTN_PRIMARY_COMPACT_SM}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
            {startLabel}
          </button>
        </form>
      )}
    </div>
  );
}
