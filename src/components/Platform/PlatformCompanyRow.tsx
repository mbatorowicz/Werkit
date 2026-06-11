"use client";

import { Fragment, useState } from "react";
import { Loader2, Pencil, Settings } from "lucide-react";
import type { CompanyUsageRow } from "@/services/PlatformAnalyticsService";
import type { AppDictionary } from "@/i18n/types";
import { useDictionary } from "@/i18n";
import { cn } from "@/lib/cn";
import { FOCUS_EMERALD } from "@/lib/uiTokens";
import { TABLE_BODY_ROW, TABLE_CELL_NAME, TABLE_TD, TABLE_TD_RIGHT } from "@/lib/uiTable";
import { FeatureFlagsSection } from "@/components/Platform/FeatureFlagsSection";

export interface PlatformCompanyRowProps {
  row: CompanyUsageRow;
  dict: AppDictionary["platform"];
  editingId: number | null;
  editName: string;
  editSlug: string;
  editPending: boolean;
  settingsOpenId: number | null;
  /** Id firmy, dla której trwa zmiana statusu aktywności (spinner na pigułce). */
  togglePendingId?: number | null;
  onToggleActive: (organizationId: number, isActive: boolean) => void;
  onStartEdit: (row: CompanyUsageRow) => void;
  onCancelEdit: () => void;
  onSaveEdit: (organizationId: number) => void;
  onSetEditName: (v: string) => void;
  onSetEditSlug: (v: string) => void;
  onRefresh: () => Promise<void>;
  onToggleSettings: (companyId: number) => void;
}

const EDIT_INPUT = cn(
  "w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-950 px-2 py-1 text-sm",
  FOCUS_EMERALD
);

export function PlatformCompanyRow({
  row: r,
  dict,
  editingId,
  editName,
  editSlug,
  editPending,
  settingsOpenId,
  togglePendingId = null,
  onToggleActive,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onSetEditName,
  onSetEditSlug,
  onRefresh,
  onToggleSettings,
}: PlatformCompanyRowProps) {
  const togglePending = togglePendingId === r.companyId;
  const settingsOpen = settingsOpenId === r.companyId;

  return (
    <Fragment>
      <tr className={TABLE_BODY_ROW}>
        <td className={TABLE_TD}>
          {editingId === r.companyId ? (
            <input
              value={editName}
              onChange={(e) => onSetEditName(e.target.value)}
              className={cn(EDIT_INPUT, "min-w-[140px] font-medium")}
            />
          ) : (
            <span className={TABLE_CELL_NAME}>{r.companyName}</span>
          )}
        </td>
        <td className={TABLE_TD}>
          {editingId === r.companyId ? (
            <input
              value={editSlug}
              onChange={(e) => onSetEditSlug(e.target.value)}
              className={cn(EDIT_INPUT, "min-w-[100px] font-mono")}
            />
          ) : (
            <code className="text-xs text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
              {r.slug}
            </code>
          )}
        </td>
        <td className={`${TABLE_TD_RIGHT} tabular-nums`}>{r.userCount}</td>
        <td className={`${TABLE_TD_RIGHT} tabular-nums`}>{r.workerCount}</td>
        <td className={`${TABLE_TD_RIGHT} tabular-nums`}>{r.sessionsLast30Days}</td>
        <td className={`${TABLE_TD_RIGHT} tabular-nums`}>{r.pendingOrders}</td>
        <td className={`${TABLE_TD_RIGHT} tabular-nums`}>{r.deviceLogsLast7Days}</td>
        <td className={TABLE_TD}>
          <button
            type="button"
            disabled={togglePending}
            onClick={() => onToggleActive(r.companyId, r.isActive)}
            title={dict.toggleActive}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-60",
              r.isActive
                ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:hover:bg-emerald-900/60"
                : "bg-zinc-200 text-zinc-600 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
            )}
          >
            {togglePending && <Loader2 className="w-3 h-3 animate-spin" aria-hidden />}
            {r.isActive ? dict.statusActive : dict.statusInactive}
          </button>
        </td>
        <td className={TABLE_TD}>
          <div className="flex items-center gap-1">
            {editingId === r.companyId ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={editPending}
                  onClick={() => onSaveEdit(r.companyId)}
                  className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-60"
                >
                  {editPending && <Loader2 className="w-3 h-3 animate-spin" aria-hidden />}
                  {dict.saveChanges}
                </button>
                <button
                  type="button"
                  onClick={onCancelEdit}
                  className="rounded-md border border-zinc-300 dark:border-zinc-600 px-2.5 py-1 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  {dict.cancelEdit}
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onStartEdit(r)}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-zinc-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-zinc-400 dark:hover:text-emerald-400 dark:hover:bg-emerald-900/20 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" aria-hidden />
                  {dict.editOrganization}
                </button>
                <button
                  type="button"
                  onClick={() => onToggleSettings(r.companyId)}
                  title={dict.settings.title}
                  aria-expanded={settingsOpen}
                  className={cn(
                    "inline-flex items-center rounded-md p-1.5 transition-colors",
                    settingsOpen
                      ? "text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/20"
                      : "text-zinc-500 hover:text-emerald-700 hover:bg-emerald-50 dark:text-zinc-400 dark:hover:text-emerald-400 dark:hover:bg-emerald-900/20"
                  )}
                >
                  <Settings className="w-3.5 h-3.5" aria-hidden />
                </button>
              </>
            )}
          </div>
        </td>
      </tr>
      {settingsOpen ? (
        <tr className="bg-zinc-50/80 dark:bg-zinc-800/30">
          <td colSpan={9} className="px-4 py-4">
            <FeatureFlagsSection companyId={r.companyId} dict={dict.settings} inline />
          </td>
        </tr>
      ) : null}
      {r.userCount === 0 && (
        <tr className="bg-amber-50/50 dark:bg-amber-950/10">
          <td colSpan={9} className="px-4 py-4">
            <OrganizationAddAdminForm organizationId={r.companyId} dict={dict} onDone={onRefresh} />
          </td>
        </tr>
      )}
    </Fragment>
  );
}

function OrganizationAddAdminForm({
  organizationId,
  dict,
  onDone,
}: {
  organizationId: number;
  dict: AppDictionary["platform"];
  onDone: () => Promise<void>;
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
      const res = await fetch(`/api/platform/companies/${organizationId}/admin`, {
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
      await onDone();
    } finally {
      setPending(false);
    }
  }

  const fieldClass = cn(
    "mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-2 py-1.5 text-sm",
    FOCUS_EMERALD
  );

  return (
    <form
      onSubmit={submit}
      className="rounded-lg border border-amber-200/80 dark:border-amber-900/40 bg-white dark:bg-zinc-900 p-4"
    >
      <p className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-3">
        {dict.noAdminYet}
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs block min-w-[140px]">
          <span className="text-zinc-500">{dict.adminName}</span>
          <input
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="text-xs block min-w-[180px]">
          <span className="text-zinc-500">{dict.adminEmail}</span>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="text-xs block min-w-[140px]">
          <span className="text-zinc-500">{dict.adminPassword}</span>
          <input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={fieldClass}
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 text-xs font-medium transition-colors disabled:opacity-60"
        >
          {pending && <Loader2 className="w-3 h-3 animate-spin" aria-hidden />}
          {dict.addAdmin}
        </button>
        {msg && (
          <p
            role="status"
            className={`text-xs self-center ${isError ? "text-red-600" : "text-emerald-600"}`}
          >
            {msg}
          </p>
        )}
      </div>
    </form>
  );
}
