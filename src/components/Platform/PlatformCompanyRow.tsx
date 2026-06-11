"use client";

import { Loader2, SlidersHorizontal } from "lucide-react";
import type { CompanyUsageRow } from "@/services/PlatformAnalyticsService";
import type { AppDictionary } from "@/i18n/types";
import { cn } from "@/lib/cn";
import { TABLE_BODY_ROW, TABLE_CELL_NAME, TABLE_TD, TABLE_TD_RIGHT } from "@/lib/uiTable";

export interface PlatformCompanyRowProps {
  row: CompanyUsageRow;
  dict: AppDictionary["platform"];
  /** Id firmy, dla której trwa zmiana statusu aktywności (spinner na pigułce). */
  togglePendingId?: number | null;
  onToggleActive: (organizationId: number, isActive: boolean) => void;
  onShowDetails: (row: CompanyUsageRow) => void;
}

export function PlatformCompanyRow({
  row: r,
  dict,
  togglePendingId = null,
  onToggleActive,
  onShowDetails,
}: PlatformCompanyRowProps) {
  const togglePending = togglePendingId === r.companyId;

  return (
    <tr className={TABLE_BODY_ROW}>
      <td className={TABLE_TD}>
        <span className={TABLE_CELL_NAME}>{r.companyName}</span>
      </td>
      <td className={TABLE_TD}>
        <code className="text-xs text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
          {r.slug}
        </code>
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
        <button
          type="button"
          onClick={() => onShowDetails(r)}
          className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-zinc-400 dark:hover:text-emerald-400 dark:hover:bg-emerald-900/20 transition-colors"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden />
          {dict.detailsAction}
        </button>
      </td>
    </tr>
  );
}
