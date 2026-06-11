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
  /** Id firmy w trakcie zmiany statusu aktywności (spinner). */
  togglePendingId?: number | null;
  onToggleActive: (organizationId: number, isActive: boolean) => void;
  onShowDetails: (row: CompanyUsageRow) => void;
};

export function PlatformCompanyTable({
  rows,
  dict,
  togglePendingId = null,
  onToggleActive,
  onShowDetails,
}: Props) {
  return (
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
                togglePendingId={togglePendingId}
                onToggleActive={onToggleActive}
                onShowDetails={onShowDetails}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
