"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { formatDict } from "@/i18n";
import { cn } from "@/lib/cn";
import { BTN_SECONDARY_SM } from "@/lib/uiButtons";

type Props = {
  companyName: string;
  userName: string;
  bannerTemplate: string;
  endLabel: string;
  endError: string;
};

export function ImpersonationBanner({
  companyName,
  userName,
  bannerTemplate,
  endLabel,
  endError,
}: Props) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function endImpersonation() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/platform/impersonation/end", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        setError(endError);
        return;
      }
      window.location.assign("/platform");
    } catch {
      setError(endError);
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      role="status"
      className={cn(
        "flex shrink-0 flex-wrap items-center justify-between gap-3 border-b px-4 py-2.5",
        "border-amber-200 bg-amber-50 text-sm text-amber-950",
        "dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-100"
      )}
    >
      <p className="min-w-0 font-medium">
        {formatDict(bannerTemplate, { company: companyName, user: userName })}
        {error ? ` ${error}` : null}
      </p>
      <button
        type="button"
        disabled={pending}
        onClick={() => void endImpersonation()}
        className={BTN_SECONDARY_SM}
      >
        {pending && <Loader2 className="h-3 w-3 animate-spin" aria-hidden />}
        {endLabel}
      </button>
    </div>
  );
}
