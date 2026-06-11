"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import type { CompanyUsageRow } from "@/services/PlatformAnalyticsService";
import type { AppDictionary } from "@/i18n/types";
import { useDictionary, formatDict } from "@/i18n";
import { cn } from "@/lib/cn";
import { FOCUS_EMERALD, INPUT_BASE } from "@/lib/uiTokens";
import { BTN_PRIMARY_COMPACT_SM } from "@/lib/uiButtons";
import { AdminModalShell } from "@/components/Admin/AdminModalShell";
import { FeatureFlagsSection } from "@/components/Platform/FeatureFlagsSection";

type TabId = "data" | "features" | "admins" | "metrics";

type Props = {
  row: CompanyUsageRow;
  dict: AppDictionary["platform"];
  onClose: () => void;
  /** Po każdej udanej zmianie — rodzic odświeża listę firm. */
  onChanged: () => Promise<void>;
};

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
      maxWidthClass="max-w-2xl"
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
          {tab === "data" && <CompanyDataTab row={row} dict={dict} onChanged={onChanged} />}
          {tab === "features" && (
            <FeatureFlagsSection companyId={row.companyId} dict={dict.settings} inline />
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
  const [name, setName] = useState(row.companyName);
  const [slug, setSlug] = useState(row.slug);
  const [savePending, setSavePending] = useState(false);
  const [statusPending, setStatusPending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

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
      await patchCompany({ name: name.trim(), slug: slug.trim().toLowerCase() });
    } finally {
      setSavePending(false);
    }
  }

  async function toggleStatus() {
    setStatusPending(true);
    setMsg(null);
    try {
      await patchCompany({ isActive: !row.isActive });
    } finally {
      setStatusPending(false);
    }
  }

  return (
    <form onSubmit={saveData} className="space-y-4">
      <label className="block text-sm">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">
          {dict.organizationName}
        </span>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={cn(INPUT_BASE, "mt-1.5")}
        />
      </label>
      <label className="block text-sm">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">
          {dict.organizationSlug}
        </span>
        <input
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          className={cn(INPUT_BASE, "mt-1.5 font-mono")}
        />
      </label>

      <div className="flex items-center gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {dict.colStatus}
        </span>
        <button
          type="button"
          disabled={statusPending}
          onClick={() => void toggleStatus()}
          title={dict.toggleActive}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors disabled:opacity-60",
            FOCUS_EMERALD,
            row.isActive
              ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:hover:bg-emerald-900/60"
              : "bg-zinc-200 text-zinc-600 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
          )}
        >
          {statusPending && <Loader2 className="h-3 w-3 animate-spin" aria-hidden />}
          {row.isActive ? dict.statusActive : dict.statusInactive}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <button type="submit" disabled={savePending} className={BTN_PRIMARY_COMPACT_SM}>
          {savePending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
          {dict.saveChanges}
        </button>
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

function CompanyAdminsTab({
  row,
  dict,
  onChanged,
}: {
  row: CompanyUsageRow;
  dict: AppDictionary["platform"];
  onChanged: () => Promise<void>;
}) {
  const apiErrors = useDictionary().apiErrors as Record<string, string>;
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/platform/companies/${row.companyId}/admin`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, usernameEmail: email, password }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setIsError(true);
        setMsg(apiErrors[body.error ?? ""] ?? dict.createError);
        return;
      }
      setIsError(false);
      setMsg(dict.addAdminSuccess);
      setFullName("");
      setEmail("");
      setPassword("");
      await onChanged();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        {formatDict(dict.accountsInOrg, { count: row.userCount })}
      </p>
      {row.userCount === 0 && (
        <p className="rounded-lg border border-amber-200/80 bg-amber-50/60 px-3 py-2 text-sm font-medium text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
          {dict.noAdminYet}
        </p>
      )}
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm">
          <span className="text-zinc-600 dark:text-zinc-400">{dict.adminName}</span>
          <input
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className={cn(INPUT_BASE, "mt-1.5")}
          />
        </label>
        <label className="block text-sm">
          <span className="text-zinc-600 dark:text-zinc-400">{dict.adminEmail}</span>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={cn(INPUT_BASE, "mt-1.5")}
          />
        </label>
        <label className="block text-sm">
          <span className="text-zinc-600 dark:text-zinc-400">{dict.adminPassword}</span>
          <input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={cn(INPUT_BASE, "mt-1.5")}
          />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={pending} className={BTN_PRIMARY_COMPACT_SM}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
            {dict.addAdmin}
          </button>
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
    </div>
  );
}

function CompanyMetricsTab({
  row,
  dict,
}: {
  row: CompanyUsageRow;
  dict: AppDictionary["platform"];
}) {
  const metrics: { label: string; value: number }[] = [
    { label: dict.colUsers, value: row.userCount },
    { label: dict.colWorkers, value: row.workerCount },
    { label: dict.colSessions30, value: row.sessionsLast30Days },
    { label: dict.colPending, value: row.pendingOrders },
    { label: dict.colLogs7, value: row.deviceLogsLast7Days },
  ];

  return (
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
  );
}
