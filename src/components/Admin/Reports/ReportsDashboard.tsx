import LiveMap from "@/components/Map/LiveMap";
import type { AppDictionary } from "@/i18n/types";
import type { ReportsDashboardSnapshot } from "@/types/admin";
import { formatUiTimeHm } from "@/i18n";
import {
  Activity,
  BarChart3,
  ClipboardList,
  HardHat,
  Layers,
  MapPin,
  TrendingDown,
  TrendingUp,
  Truck,
  Users,
  Warehouse,
} from "lucide-react";
import { ReportStatCard } from "./ReportStatCard";

type AdminSlice = AppDictionary["admin"];

export function ReportsDashboard({
  adminDict,
  snapshot,
}: {
  adminDict: AdminSlice;
  snapshot: ReportsDashboardSnapshot;
}) {
  const r = adminDict.reports;
  const nav = adminDict.sidebar;
  const d = adminDict.dashboard;
  const companyLabel = snapshot.companyName ?? "";

  const maxCat =
    snapshot.activeSessionsByCategory.length > 0
      ? Math.max(...snapshot.activeSessionsByCategory.map((c) => c.count), 1)
      : 1;
  const maxMach =
    snapshot.topMachinesThisMonth.length > 0
      ? Math.max(...snapshot.topMachinesThisMonth.map((m) => m.sessionCount), 1)
      : 1;

  let trendLabel = r.vsPrevMonthFlat;
  let TrendIcon = Activity;
  let trendClass = "text-zinc-500";
  if (snapshot.monthOverMonthPercent !== null) {
    if (snapshot.monthOverMonthPercent > 0) {
      trendLabel = `${snapshot.monthOverMonthPercent}% ${r.vsPrevMonthUp}`;
      TrendIcon = TrendingUp;
      trendClass = "text-emerald-600 dark:text-emerald-400";
    } else if (snapshot.monthOverMonthPercent < 0) {
      trendLabel = `${Math.abs(snapshot.monthOverMonthPercent)}% ${r.vsPrevMonthDown}`;
      TrendIcon = TrendingDown;
      trendClass = "text-rose-600 dark:text-rose-400";
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto w-full space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-emerald-500" /> {nav.reports}
          </h1>
          <p className="text-zinc-500 mt-1">
            {r.subtitle} {companyLabel ? `${companyLabel}.` : ""}
          </p>
          <p className="text-xs text-zinc-400 mt-2">{r.periodHint}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <ReportStatCard
          icon={Users}
          iconWrapClass="bg-indigo-500/10 text-indigo-500 dark:text-indigo-400"
          title={r.workersWithAssignedOrders}
          value={snapshot.workersWithPendingOrders}
        />
        <ReportStatCard
          icon={Activity}
          iconWrapClass="bg-emerald-500/10 text-emerald-500 dark:text-emerald-400"
          title={r.workersCurrentlyWorking}
          value={snapshot.workersActiveNow}
        />
        <ReportStatCard
          icon={ClipboardList}
          iconWrapClass="bg-amber-500/10 text-amber-500 dark:text-amber-400"
          title={r.pendingOrdersTotal}
          value={snapshot.pendingOrdersTotal}
        />
        <ReportStatCard
          icon={Layers}
          iconWrapClass="bg-violet-500/10 text-violet-500 dark:text-violet-400"
          title={r.activeSessionsLive}
          value={snapshot.activeSessions.length}
        />
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 bg-zinc-500/10 rounded-lg">
            <HardHat className="w-5 h-5 text-zinc-600 dark:text-zinc-300" />
          </div>
          <h2 className="font-semibold text-zinc-900 dark:text-white">{r.activeByCategoryTitle}</h2>
        </div>
        {snapshot.activeSessionsByCategory.length === 0 ? (
          <p className="text-zinc-500 text-sm">{d.noActiveSessions}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {snapshot.activeSessionsByCategory.map(({ categoryName, count }) => (
              <div key={categoryName ?? "__none__"} className="flex items-center gap-3">
                <Truck className="w-4 h-4 text-emerald-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">
                    {categoryName ?? r.uncategorized}
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

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg flex flex-col overflow-hidden shadow-sm">
            <div className="px-6 py-5 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950/50">
              <h2 className="font-semibold text-zinc-900 dark:text-white">{r.activeEquipmentTitle}</h2>
              <p className="text-xs text-zinc-500 mt-1">{r.taskSummaryHint}</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-700/50 bg-zinc-100/50 dark:bg-[#0a0a0b]/80">
                    <th className="px-6 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      {d.whoAndWhere}
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      {d.equipment}
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      {d.startTime}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/50">
                  {snapshot.activeSessions.map((session) => (
                    <tr
                      key={session.id}
                      className="hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="font-medium text-zinc-900 dark:text-zinc-200">{session.userName}</div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                          {session.taskDescription || "—"}{" "}
                          {session.quantityTons ? `(${session.quantityTons} t)` : ""}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-amber-600 dark:text-amber-400 font-medium">
                        {session.resourceName ?? "—"}
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-500">
                        {formatUiTimeHm(session.startTime)}
                      </td>
                    </tr>
                  ))}
                  {snapshot.activeSessions.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-center text-zinc-500 dark:text-zinc-400 text-sm">
                        {d.noActiveSessions}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="xl:col-span-1 min-h-[450px]">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden h-full flex flex-col relative shadow-sm min-h-[450px]">
            <div className="absolute top-0 left-0 right-0 px-5 py-4 bg-gradient-to-b from-white/90 dark:from-zinc-950/90 to-transparent z-10 pointer-events-none">
              <h2 className="font-semibold text-zinc-900 dark:text-white drop-shadow-md flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-500" />
                {(snapshot.companyCity || r.mapFallbackRegion) + " — " + d.liveRadars}
              </h2>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 drop-shadow-md">{d.detectedProviders}</p>
            </div>
            <div className="flex-1 w-full relative min-h-[450px]">
              <LiveMap
                currentLocation={{ lat: snapshot.mapLat, lng: snapshot.mapLng }}
                pathTraveled={[]}
                destination={null}
              />
            </div>
          </div>
        </div>
      </div>

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
                  <div className="w-36 truncate text-sm font-medium text-zinc-700 dark:text-zinc-300" title={name}>
                    {name}
                  </div>
                  <div className="flex-1 h-3 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all"
                      style={{ width: `${(sessionCount / maxMach) * 100}%` }}
                    />
                  </div>
                  <div className="w-8 text-right text-xs font-bold text-zinc-500 tabular-nums">{sessionCount}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
