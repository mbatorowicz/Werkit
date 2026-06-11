"use client";

import type { CompanyUsageRow } from "@/services/PlatformAnalyticsService";
import type { AppDictionary } from "@/i18n/types";
import {
  TABLE_EMPTY_CELL,
  TABLE_HEAD,
  TABLE_HEAD_ROW,
  TABLE_TH,
  TABLE_TH_RIGHT,
  TABLE_WRAPPER,
} from "@/lib/uiTable";
import { PlatformCompanyRow } from "@/components/Platform/PlatformCompanyRow";

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
                <PlatformCompanyRow
                  key={r.companyId}
                  row={r}
                  dict={dict}
                  editingId={editingId}
                  editName={editName}
                  editSlug={editSlug}
                  editPending={editPending}
                  settingsOpenId={settingsOpenId}
                  onToggleActive={onToggleActive}
                  onStartEdit={onStartEdit}
                  onCancelEdit={onCancelEdit}
                  onSaveEdit={onSaveEdit}
                  onSetEditName={onSetEditName}
                  onSetEditSlug={onSetEditSlug}
                  onRefresh={onRefresh}
                  onToggleSettings={onToggleSettings}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
