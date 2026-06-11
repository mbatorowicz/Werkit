import { Activity, TrendingDown, TrendingUp, Warehouse } from "lucide-react";
import type { AppDictionary } from "@/i18n/types";
import type { ReportsDashboardSnapshot } from "@/types/admin";

type ReportsDict = AppDictionary["admin"]["reports"];

function monthTrend(monthOverMonthPercent: number | null, r: ReportsDict) {
  let trendLabel = r.vsPrevMonthFlat;
  let TrendIcon = Activity;
  let trendClass = "text-zinc-500";
  if (monthOverMonthPercent !== null) {
    if (monthOverMonthPercent > 0) {
      trendLabel = `${monthOverMonthPercent}% ${r.vsPrevMonthUp}`;
      TrendIcon = TrendingUp;
      trendClass = "text-emerald-600 dark:text-emerald-400";
    } else if (monthOverMonthPercent < 0) {
      trendLabel = `${Math.abs(monthOverMonthPercent)}% ${r.vsPrevMonthDown}`;
      TrendIcon = TrendingDown;
      trendClass = "text-rose-600 dark:text-rose-400";
    }
  }
  return { trendLabel, TrendIcon, trendClass };
}

export interface ReportsMonthlyPanelsProps {
  reportsDict: ReportsDict;
  dashboardDict: AppDictionary["admin"]["dashboard"];
  snapshot: ReportsDashboardSnapshot;
}

export function ReportsMonthlyPanels({
  reportsDict: r,
  dashboardDict: d,
  snapshot,
}: ReportsMonthlyPanelsProps) {
  const maxMach =
    snapshot.topMachinesThisMonth.length > 0
      ? Math.max(...snapshot.topMachinesThisMonth.map((m) => m.sessionCount), 1)
      : 1;
  const { trendLabel, TrendIcon, trendClass } = monthTrend(snapshot.monthOverMonthPercent, r);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-emerald-500/10 rounded-lg">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <h2 className="font-semibold text-zinc-900 dark:text-white">{d.efficiencyThisMonth}</h2>
            <p className={`text-xs mt-1 flex items-center gap-1 ${trendClass}`}>
              <TrendIcon className="w-3.5 h-3.5" />
              {trendLabel}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-[#f2fbfa] dark:bg-zinc-950 border border-emerald-100 dark:border-zinc-800 rounded-xl">
            <div className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-1">
              {d.completedTasks}
            </div>
            <div className="text-3xl font-black text-emerald-600 dark:text-emerald-500">
              {snapshot.completedSessionsThisMonth}
            </div>
            <div className="text-[10px] text-zinc-400 mt-1">{r.completedSessionsLabel}</div>
          </div>
          <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl">
            <div className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-1">
              {d.transportedMaterials}
            </div>
            <div className="text-3xl font-black text-zinc-900 dark:text-white">
              {snapshot.tonsThisMonth.toFixed(1)} <span className="text-lg text-zinc-500">t</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-amber-500/10 rounded-lg">
            <Warehouse className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h2 className="font-semibold text-zinc-900 dark:text-white">{d.machineUtilization}</h2>
            <p className="text-xs text-zinc-500 mt-1">{r.topMachinesSubtitle}</p>
          </div>
        </div>

        <div className="space-y-4">
          {snapshot.topMachinesThisMonth.length === 0 ? (
            <p className="text-zinc-500 text-sm italic">{d.noDataThisMonth}</p>
          ) : (
            snapshot.topMachinesThisMonth.map(({ name, sessionCount }) => (
              <div key={name} className="flex items-center gap-4">
                <div
                  className="w-36 truncate text-sm font-medium text-zinc-700 dark:text-zinc-300"
                  title={name}
                >
                  {name}
                </div>
                <div className="flex-1 h-3 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all"
                    style={{ width: `${(sessionCount / maxMach) * 100}%` }}
                  />
                </div>
                <div className="w-8 text-right text-xs font-bold text-zinc-500 tabular-nums">
                  {sessionCount}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
