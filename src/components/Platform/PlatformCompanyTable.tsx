"use client";

import { Fragment, useState } from "react";
import { Pencil, Settings } from "lucide-react";
import type { CompanyUsageRow } from "@/services/PlatformAnalyticsService";
import type { AppDictionary } from "@/i18n/types";
import { useDictionary } from "@/i18n";
import {
  TABLE_BODY_ROW,
  TABLE_CELL_NAME,
  TABLE_EMPTY_CELL,
  TABLE_HEAD,
  TABLE_HEAD_ROW,
  TABLE_TD,
  TABLE_TD_RIGHT,
  TABLE_TH,
  TABLE_TH_RIGHT,
  TABLE_WRAPPER,
} from "@/lib/uiTable";
import { FeatureFlagsSection } from "@/components/Platform/FeatureFlagsSection";

type Props = {
  rows: CompanyUsageRow[];
  dict: AppDictionary["platform"];
  editingId: number | null;
  editName: string;
  editSlug: string;
  editPending: boolean;
  settingsOpenId: number | null;
  onToggleActive: (organizationId: number, isActive: boolean) => void;
  onStartEdit: (row: CompanyUsageRow) => void;
  onCancelEdit: () => void;
  onSaveEdit: (organizationId: number) => void;
  onSetEditName: (v: string) => void;
  onSetEditSlug: (v: string) => void;
  onRefresh: () => Promise<void>;
  onToggleSettings: (companyId: number) => void;
};

export function PlatformCompanyTable({
  rows,
  dict,
  editingId,
  editName,
  editSlug,
  editPending,
  settingsOpenId,
  onToggleActive,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onSetEditName,
  onSetEditSlug,
  onRefresh,
  onToggleSettings,
}: Props) {
  return (
    <section className="mt-10">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          {dict.registryTitle}
        </h2>
        <p className="text-sm text-zinc-500 mt-0.5">{dict.usageTitle}</p>
      </div>
      <div className={`${TABLE_WRAPPER} bg-white shadow-sm dark:bg-zinc-900`}>
        <table className="min-w-full text-sm">
            <thead className={TABLE_HEAD}>
              <tr className={TABLE_HEAD_ROW}>
                <th className={TABLE_TH}>{dict.colOrganization}</th>
                <th className={TABLE_TH}>{dict.colIdentifier}</th>
                <th className={TABLE_TH_RIGHT}>{dict.colUsers}</th>
                <th className={TABLE_TH_RIGHT}>{dict.colWorkers}</th>
                <th className={TABLE_TH_RIGHT}>{dict.colSessions30}</th>
                <th className={TABLE_TH_RIGHT}>{dict.colPending}</th>
                <th className={TABLE_TH_RIGHT}>{dict.colLogs7}</th>
                <th className={TABLE_TH}>{dict.colStatus}</th>
                <th className={TABLE_TH}>{dict.colActions}</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className={TABLE_EMPTY_CELL}>
                    {dict.empty}
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <Fragment key={r.companyId}>
                    <tr className={TABLE_BODY_ROW}>
                      <td className={TABLE_TD}>
                      {editingId === r.companyId ? (
                        <input
                          value={editName}
                          onChange={(e) => onSetEditName(e.target.value)}
                          className="w-full min-w-[140px] rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-950 px-2 py-1 text-sm font-medium"
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
                          className="w-full min-w-[100px] rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-950 px-2 py-1 text-sm font-mono"
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
                        onClick={() => onToggleActive(r.companyId, r.isActive)}
                        title={dict.toggleActive}
                        className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                          r.isActive
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                            : "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                        }`}
                      >
                        {r.isActive ? dict.statusActive : dict.statusInactive}
                      </button>
                    </td>
                    <td className={TABLE_TD}>
                      <div className="flex items-center gap-2">
                        {editingId === r.companyId ? (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={editPending}
                              onClick={() => onSaveEdit(r.companyId)}
                              className="rounded-md bg-emerald-600 text-white px-2.5 py-1 text-xs font-medium disabled:opacity-60"
                            >
                              {dict.saveChanges}
                            </button>
                            <button
                              type="button"
                              onClick={onCancelEdit}
                              className="rounded-md border border-zinc-300 dark:border-zinc-600 px-2.5 py-1 text-xs"
                            >
                              {dict.cancelEdit}
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => onStartEdit(r)}
                              className="inline-flex items-center gap-1 text-xs font-medium text-zinc-600 hover:text-emerald-600 dark:text-zinc-400 dark:hover:text-emerald-400"
                            >
                              <Pencil className="w-3.5 h-3.5" aria-hidden />
                              {dict.editOrganization}
                            </button>
                            <button
                              type="button"
                              onClick={() => onToggleSettings(r.companyId)}
                              title={dict.settings.title}
                              className={`inline-flex items-center gap-1 text-xs font-medium transition-colors ${
                                settingsOpenId === r.companyId
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-zinc-500 hover:text-emerald-600 dark:text-zinc-400 dark:hover:text-emerald-400"
                              }`}
                            >
                              <Settings className="w-3.5 h-3.5" aria-hidden />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                  {settingsOpenId === r.companyId ? (
                    <tr className="bg-zinc-50/80 dark:bg-zinc-800/30">
                      <td colSpan={9} className="px-4 py-4">
                        <FeatureFlagsSection
                          companyId={r.companyId}
                          dict={dict.settings}
                          inline
                        />
                      </td>
                    </tr>
                  ) : null}
                  {r.userCount === 0 && (
                    <tr className="bg-amber-50/50 dark:bg-amber-950/10">
                      <td colSpan={9} className="px-4 py-4">
                        <OrganizationAddAdminForm
                          organizationId={r.companyId}
                          dict={dict}
                          onDone={onRefresh}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
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
            className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs block min-w-[180px]">
          <span className="text-zinc-500">{dict.adminEmail}</span>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs block min-w-[140px]">
          <span className="text-zinc-500">{dict.adminPassword}</span>
          <input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-2 py-1.5 text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 px-4 py-2 text-xs font-medium disabled:opacity-60"
        >
          {dict.addAdmin}
        </button>
        {msg && (
          <p className={`text-xs self-center ${isError ? "text-red-600" : "text-emerald-600"}`}>
            {msg}
          </p>
        )}
      </div>
    </form>
  );
}
