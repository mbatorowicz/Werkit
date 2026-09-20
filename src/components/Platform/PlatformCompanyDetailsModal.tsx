"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import type { CompanyUsageRow } from "@/services/PlatformAnalyticsService";
import type { AppDictionary } from "@/i18n/types";
import { formatDict, formatUiDateTimeShort, useDictionary } from "@/i18n";
import { useAppDialog } from "@/components/AppDialogProvider";
import { cn } from "@/lib/cn";
import { CARD_NESTED, INPUT_BASE, SELECT_BASE, TEXTAREA_BASE } from "@/lib/uiTokens";
import { FIELD_HINT, FIELD_LABEL } from "@/lib/uiTypography";
import { BTN_DANGER_SOFT, BTN_PRIMARY_COMPACT_SM } from "@/lib/uiButtons";
import { AdminModalShell } from "@/components/Admin/AdminModalShell";
import { FeatureFlagsSection } from "@/components/Platform/FeatureFlagsSection";
import { CompanyAdminsTab } from "@/components/Platform/CompanyAdminsTab";
import { PLATFORM_PRODUCT_LIMITS } from "@/lib/platformProductLimits";
import {
  INTERNAL_NOTE_MAX_LENGTH,
  isCompanyLifecycleStatus,
  type CompanyLifecycleStatus,
} from "@/lib/companyLifecycle";

type TabId = "data" | "features" | "admins" | "metrics";

type Props = {
  row: CompanyUsageRow;
  dict: AppDictionary["platform"];
  onClose: () => void;
  /** Po każdej udanej zmianie — rodzic odświeża listę firm. */
  onChanged: () => Promise<void>;
};

const EDITABLE_LIFECYCLES: CompanyLifecycleStatus[] = ["trial", "active", "suspended"];

function lifecycleLabel(dict: AppDictionary["platform"], status: CompanyLifecycleStatus): string {
  if (status === "trial") return dict.statusTrial;
  if (status === "archived") return dict.statusArchived;
  if (status === "suspended") return dict.statusInactive;
  return dict.statusActive;
}

/** Panel szczegółów organizacji: dane, flagi funkcji, administratorzy, wskaźniki. */
export function PlatformCompanyDetailsModal({ row, dict, onClose, onChanged }: Props) {
  const [tab, setTab] = useState<TabId>("data");

  const tabs: { id: TabId; label: string }[] = [
    { id: "data", label: dict.tabData },
    { id: "features", label: dict.tabFeatures },
    { id: "admins", label: dict.tabAdmins },
    { id: "metrics", label: dict.tabMetrics },
  ];

  return (
    <AdminModalShell
      open
      onClose={onClose}
      title={`${dict.detailsTitle} — ${row.companyName}`}
      maxWidthClass="max-w-3xl"
      titleSize="lg"
      scrollableBody
      closeOnBackdropClick={false}
    >
      <div className="flex min-h-[22rem] flex-col">
        <div
          role="tablist"
          className="flex shrink-0 gap-1 border-b border-zinc-200 px-4 pt-3 dark:border-zinc-800"
        >
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "rounded-t-md px-3 py-2 text-sm font-medium transition-colors",
                tab === t.id
                  ? "border-b-2 border-emerald-600 text-emerald-700 dark:text-emerald-400"
                  : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="p-6">
          {tab === "data" && (
            <CompanyDataTab
              key={`${row.companyId}-${row.lifecycleStatus}`}
              row={row}
              dict={dict}
              onChanged={onChanged}
            />
          )}
          {tab === "features" && (
            <FeatureFlagsSection
              companyId={row.companyId}
              dict={dict.settings}
              inline
              initialPlanKey={row.planKey}
              onChanged={onChanged}
            />
          )}
          {tab === "admins" && <CompanyAdminsTab row={row} dict={dict} onChanged={onChanged} />}
          {tab === "metrics" && <CompanyMetricsTab row={row} dict={dict} />}
        </div>
      </div>
    </AdminModalShell>
  );
}

function CompanyDataTab({
  row,
  dict,
  onChanged,
}: {
  row: CompanyUsageRow;
  dict: AppDictionary["platform"];
  onChanged: () => Promise<void>;
}) {
  const apiErrors = useDictionary().apiErrors as Record<string, string>;
  const { confirm: appConfirm } = useAppDialog();
  const [name, setName] = useState(row.companyName);
  const [slug, setSlug] = useState(row.slug);
  const [lifecycleStatus, setLifecycleStatus] = useState<CompanyLifecycleStatus>(
    row.lifecycleStatus
  );
  const [internalNote, setInternalNote] = useState(row.internalNote ?? "");
  const [savePending, setSavePending] = useState(false);
  const [archivePending, setArchivePending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const archived = row.lifecycleStatus === "archived";

  async function patchCompany(body: Record<string, unknown>): Promise<boolean> {
    const res = await fetch(`/api/platform/companies/${row.companyId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setIsError(true);
      setMsg(apiErrors[data.error ?? ""] ?? dict.updateError);
      return false;
    }
    setIsError(false);
    setMsg(dict.updateSuccess);
    await onChanged();
    return true;
  }

  async function saveData(e: React.FormEvent) {
    e.preventDefault();
    setSavePending(true);
    setMsg(null);
    try {
      await patchCompany({
        name: name.trim(),
        slug: slug.trim().toLowerCase(),
        lifecycleStatus,
        internalNote,
      });
    } finally {
      setSavePending(false);
    }
  }

  async function archiveCompany() {
    const confirmed = await appConfirm({
      message: formatDict(dict.archiveCompanyConfirm, { name: row.companyName }),
      variant: "danger",
    });
    if (!confirmed) return;
    setArchivePending(true);
    setMsg(null);
    try {
      await patchCompany({ lifecycleStatus: "archived" });
    } finally {
      setArchivePending(false);
    }
  }

  return (
    <form onSubmit={saveData} className="space-y-4">
      <label className="block text-sm">
        <span className={FIELD_LABEL}>{dict.organizationName}</span>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={cn(INPUT_BASE, "mt-1.5")}
        />
      </label>
      <label className="block text-sm">
        <span className={FIELD_LABEL}>{dict.organizationSlug}</span>
        <input
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          className={cn(INPUT_BASE, "mt-1.5 font-mono")}
        />
      </label>

      <label className="block text-sm">
        <span className={FIELD_LABEL}>{dict.lifecycleLabel}</span>
        <select
          value={lifecycleStatus}
          onChange={(e) => {
            const next = e.target.value;
            if (isCompanyLifecycleStatus(next)) setLifecycleStatus(next);
          }}
          className={cn(SELECT_BASE, "mt-1.5")}
        >
          {(archived ? (["archived", ...EDITABLE_LIFECYCLES] as const) : EDITABLE_LIFECYCLES).map(
            (status) => (
              <option key={status} value={status}>
                {lifecycleLabel(dict, status)}
              </option>
            )
          )}
        </select>
        <span className={cn(FIELD_HINT, "mt-1 block")}>{dict.lifecycleHint}</span>
      </label>

      <label className="block text-sm">
        <span className={FIELD_LABEL}>{dict.internalNote}</span>
        <textarea
          value={internalNote}
          maxLength={INTERNAL_NOTE_MAX_LENGTH}
          onChange={(e) => setInternalNote(e.target.value)}
          placeholder={dict.internalNotePlaceholder}
          className={cn(TEXTAREA_BASE, "mt-1.5")}
        />
        <span className={cn(FIELD_HINT, "mt-1 block")}>{dict.internalNoteHint}</span>
      </label>

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <button type="submit" disabled={savePending} className={BTN_PRIMARY_COMPACT_SM}>
          {savePending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
          {dict.saveChanges}
        </button>
        {!archived ? (
          <button
            type="button"
            disabled={archivePending}
            onClick={() => void archiveCompany()}
            className={BTN_DANGER_SOFT}
          >
            {archivePending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
            {dict.archiveCompany}
          </button>
        ) : null}
        {msg && (
          <p
            role="status"
            className={`text-sm ${isError ? "text-red-600 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400"}`}
          >
            {msg}
          </p>
        )}
      </div>
    </form>
  );
}

function CompanyMetricsTab({
  row,
  dict,
}: {
  row: CompanyUsageRow;
  dict: AppDictionary["platform"];
}) {
  const metrics: { label: string; value: string }[] = [
    { label: dict.colUsers, value: String(row.userCount) },
    { label: dict.colWorkers, value: String(row.workerCount) },
    { label: dict.colSessions30, value: String(row.sessionsLast30Days) },
    { label: dict.colActiveSessions, value: String(row.activeSessionsNow) },
    { label: dict.colPending, value: String(row.pendingOrders) },
    { label: dict.colLogs7, value: String(row.deviceLogsLast7Days) },
    { label: dict.colErrorLogs24h, value: String(row.errorLogsLast24h) },
    {
      label: dict.colLastAdminLogin,
      value: row.lastAdminLoginAt
        ? formatUiDateTimeShort(row.lastAdminLoginAt)
        : dict.lastLoginNever,
    },
    {
      label: dict.colLastWorkerLogin,
      value: row.lastWorkerLoginAt
        ? formatUiDateTimeShort(row.lastWorkerLoginAt)
        : dict.lastLoginNever,
    },
  ];

  return (
    <div className="space-y-6">
      <dl className="grid gap-3 sm:grid-cols-2">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="rounded-lg border border-zinc-200 bg-zinc-50/60 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-800/30"
          >
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {m.label}
            </dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
              {m.value}
            </dd>
          </div>
        ))}
      </dl>
      <section className={CARD_NESTED}>
        <h3 className={FIELD_LABEL}>{dict.productLimitsTitle}</h3>
        <p className={FIELD_HINT}>
          {formatDict(dict.productLimitsHint, {
            gps: PLATFORM_PRODUCT_LIMITS.gpsPointsPerRequest,
            photoMb: PLATFORM_PRODUCT_LIMITS.photoMaxMib,
            logs: PLATFORM_PRODUCT_LIMITS.deviceLogsPerMinute,
          })}
        </p>
      </section>
    </div>
  );
}
