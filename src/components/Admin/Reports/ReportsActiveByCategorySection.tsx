import { HardHat, Truck } from "lucide-react";
import type { AppDictionary } from "@/i18n/types";
import type { ReportsDashboardSnapshot } from "@/types/admin";

export interface ReportsActiveByCategorySectionProps {
  reportsDict: AppDictionary["admin"]["reports"];
  dashboardDict: AppDictionary["admin"]["dashboard"];
  activeSessionsByCategory: ReportsDashboardSnapshot["activeSessionsByCategory"];
}

export function ReportsActiveByCategorySection({
  reportsDict,
  dashboardDict,
  activeSessionsByCategory,
}: ReportsActiveByCategorySectionProps) {
  const maxCat =
    activeSessionsByCategory.length > 0
      ? Math.max(...activeSessionsByCategory.map((c) => c.count), 1)
      : 1;

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 bg-zinc-500/10 rounded-lg">
          <HardHat className="w-5 h-5 text-zinc-600 dark:text-zinc-300" />
        </div>
        <h2 className="font-semibold text-zinc-900 dark:text-white">
          {reportsDict.activeByCategoryTitle}
        </h2>
      </div>
      {activeSessionsByCategory.length === 0 ? (
        <p className="text-zinc-500 text-sm">{dashboardDict.noActiveSessions}</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {activeSessionsByCategory.map(({ categoryName, count }) => (
            <div key={categoryName ?? "__none__"} className="flex items-center gap-3">
              <Truck className="w-4 h-4 text-emerald-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">
                  {categoryName ?? reportsDict.uncategorized}
                </div>
                <div className="mt-1 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${Math.max(8, (count / maxCat) * 100)}%` }}
                  />
                </div>
              </div>
              <span className="text-sm font-bold text-zinc-500 tabular-nums">{count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
