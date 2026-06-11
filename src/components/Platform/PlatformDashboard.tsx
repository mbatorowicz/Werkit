"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import type { CompanyUsageRow } from "@/services/PlatformAnalyticsService";
import type { AppDictionary } from "@/i18n/types";
import { formatDict } from "@/i18n";
import { BTN_PRIMARY_COMPACT } from "@/lib/uiButtons";
import { PlatformCompanyCreateModal } from "@/components/Platform/PlatformCompanyCreateModal";
import { PlatformCompanyDetailsModal } from "@/components/Platform/PlatformCompanyDetailsModal";
import { PlatformCompanyTable } from "@/components/Platform/PlatformCompanyTable";

type Props = {
  initialOverview: CompanyUsageRow[];
  dict: AppDictionary["platform"];
};

export function PlatformDashboard({ initialOverview, dict }: Props) {
  const [rows, setRows] = useState(initialOverview);
  const [message, setMessage] = useState<string | null>(null);
  const [messageIsError, setMessageIsError] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  /** Id firmy z otwartym panelem szczegółów. */
  const [detailsId, setDetailsId] = useState<number | null>(null);
  /** Dla której organizacji trwa zmiana statusu aktywności. */
  const [togglePendingId, setTogglePendingId] = useState<number | null>(null);

  const detailsRow = detailsId !== null ? rows.find((r) => r.companyId === detailsId) : undefined;

  async function refreshOverview() {
    const res = await fetch("/api/platform/analytics", { credentials: "include" });
    if (!res.ok) return;
    const data = await res.json();
    if (Array.isArray(data)) setRows(data as CompanyUsageRow[]);
  }

  function showFeedback(text: string, isError: boolean) {
    setMessage(text);
    setMessageIsError(isError);
  }

  async function handleCreated() {
    showFeedback(dict.createSuccess, false);
    await refreshOverview();
  }

  async function toggleActive(organizationId: number, isActive: boolean) {
    if (togglePendingId !== null) return;
    setTogglePendingId(organizationId);
    try {
      const res = await fetch(`/api/platform/companies/${organizationId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      if (res.ok) {
        await refreshOverview();
      } else {
        showFeedback(dict.updateError, true);
      }
    } finally {
      setTogglePendingId(null);
    }
  }

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            {dict.registryTitle}
          </h2>
          <p className="mt-0.5 text-sm text-zinc-500">
            {formatDict(dict.totalCount, { count: rows.length })}
          </p>
        </div>
        <button type="button" onClick={() => setCreateOpen(true)} className={BTN_PRIMARY_COMPACT}>
          <Plus className="mr-1.5 h-4 w-4" aria-hidden />
          {dict.addOrganization}
        </button>
      </header>

      {message && (
        <p
          role="status"
          className={`mb-4 text-sm ${messageIsError ? "text-red-600 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400"}`}
        >
          {message}
        </p>
      )}

      <PlatformCompanyTable
        rows={rows}
        dict={dict}
        togglePendingId={togglePendingId}
        onToggleActive={toggleActive}
        onShowDetails={(row) => setDetailsId(row.companyId)}
      />

      <PlatformCompanyCreateModal
        open={createOpen}
        dict={dict}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
      />

      {detailsRow && (
        <PlatformCompanyDetailsModal
          row={detailsRow}
          dict={dict}
          onClose={() => setDetailsId(null)}
          onChanged={refreshOverview}
        />
      )}
    </div>
  );
}
