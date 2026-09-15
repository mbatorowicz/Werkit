"use client";

import { useCallback, useEffect, useState } from "react";
import type { AppDictionary } from "@/i18n/types";
import { formatUiDateTimeShort } from "@/i18n";
import { SELECT_BASE } from "@/lib/uiTokens";
import { FIELD_LABEL } from "@/lib/uiTypography";
import {
  TABLE_EMPTY_CELL,
  TABLE_HEAD,
  TABLE_HEAD_ROW,
  TABLE_BODY_ROW,
  TABLE_TD,
  TABLE_TH,
  TABLE_WRAPPER,
} from "@/lib/uiTable";
import { PLATFORM_AUDIT_ACTIONS, type PlatformAuditListRow } from "@/lib/platformAuditCatalog";
import { narrowPlatformAuditEvents } from "@/lib/narrow/platform";

type CompanyOption = { id: number; name: string };

type Props = {
  dict: AppDictionary["platform"];
};

function formatTarget(row: PlatformAuditListRow, dict: AppDictionary["platform"]): string {
  const typeLabel = row.targetType ?? dict.auditCompanyGlobal;
  if (row.targetId == null) return typeLabel;
  return `${typeLabel} #${row.targetId}`;
}

function narrowCompanyOptions(data: unknown): CompanyOption[] {
  if (!Array.isArray(data)) return [];
  const out: CompanyOption[] = [];
  for (const item of data) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const id = rec.id;
    const name = rec.name;
    if (typeof id === "number" && Number.isInteger(id) && id >= 1 && typeof name === "string") {
      out.push({ id, name });
    }
  }
  return out;
}

export function PlatformAuditLog({ dict }: Props) {
  const [events, setEvents] = useState<PlatformAuditListRow[]>([]);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [action, setAction] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (companyId) params.set("companyId", companyId);
      if (action) params.set("action", action);
      params.set("limit", "100");
      const res = await fetch(`/api/platform/audit?${params.toString()}`, {
        credentials: "include",
      });
      const body: unknown = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEvents([]);
        setError(dict.auditLoadError);
        return;
      }
      const rec = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
      setEvents(narrowPlatformAuditEvents(rec.events));
    } catch {
      setEvents([]);
      setError(dict.auditLoadError);
    } finally {
      setLoading(false);
    }
  }, [action, companyId, dict.auditLoadError]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/platform/companies", { credentials: "include" });
        if (!res.ok) return;
        const data: unknown = await res.json();
        if (!cancelled) setCompanies(narrowCompanyOptions(data));
      } catch {
        /* lista firm tylko do filtra — dziennik i tak działa */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <header className="mb-6">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{dict.auditTitle}</h2>
        <p className="mt-0.5 text-sm text-zinc-500">{dict.auditSubtitle}</p>
      </header>

      <div className="mb-4 flex flex-wrap gap-4">
        <label className="min-w-[12rem] flex-1">
          <span className={FIELD_LABEL}>{dict.auditFilterCompany}</span>
          <select
            className={SELECT_BASE}
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
          >
            <option value="">{dict.auditFilterAll}</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-[12rem] flex-1">
          <span className={FIELD_LABEL}>{dict.auditFilterAction}</span>
          <select
            className={SELECT_BASE}
            value={action}
            onChange={(e) => setAction(e.target.value)}
          >
            <option value="">{dict.auditFilterAll}</option>
            {PLATFORM_AUDIT_ACTIONS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? (
        <p role="alert" className="mb-4 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}

      <div className={`${TABLE_WRAPPER} bg-white shadow-sm dark:bg-zinc-900`}>
        <table className="min-w-full text-sm">
          <thead className={TABLE_HEAD}>
            <tr className={TABLE_HEAD_ROW}>
              <th className={TABLE_TH}>{dict.auditColTime}</th>
              <th className={TABLE_TH}>{dict.auditColActor}</th>
              <th className={TABLE_TH}>{dict.auditColCompany}</th>
              <th className={TABLE_TH}>{dict.auditColAction}</th>
              <th className={TABLE_TH}>{dict.auditColTarget}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className={TABLE_EMPTY_CELL}>
                  {dict.auditLoading}
                </td>
              </tr>
            ) : events.length === 0 ? (
              <tr>
                <td colSpan={5} className={TABLE_EMPTY_CELL}>
                  {dict.auditEmpty}
                </td>
              </tr>
            ) : (
              events.map((row) => (
                <tr key={row.id} className={TABLE_BODY_ROW}>
                  <td className={`${TABLE_TD} whitespace-nowrap tabular-nums`}>
                    {formatUiDateTimeShort(row.createdAt)}
                  </td>
                  <td className={TABLE_TD}>{row.actorName}</td>
                  <td className={TABLE_TD}>{row.companyName ?? dict.auditCompanyGlobal}</td>
                  <td className={TABLE_TD}>
                    <code className="text-xs text-zinc-600 dark:text-zinc-300">{row.action}</code>
                  </td>
                  <td className={TABLE_TD}>{formatTarget(row, dict)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
