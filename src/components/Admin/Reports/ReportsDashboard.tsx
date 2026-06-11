import type { AppDictionary } from "@/i18n/types";
import type { ReportsDashboardSnapshot } from "@/types/admin";
import { Activity, BarChart3, ClipboardList, Layers, Users } from "lucide-react";
import { ReportStatCard } from "./ReportStatCard";
import { ReportsActiveByCategorySection } from "./ReportsActiveByCategorySection";
import { ReportsLiveOpsSection } from "./ReportsLiveOpsSection";
import { ReportsMonthlyPanels } from "./ReportsMonthlyPanels";

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

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto w-full space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-emerald-500" /> {nav.reports}
          </h1>
          {companyLabel ? <p className="text-zinc-500 mt-1">{companyLabel}</p> : null}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <ReportStatCard
          icon={Users}
          iconWrapClass="bg-emerald-500/10 text-emerald-500 dark:text-emerald-400"
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

      <ReportsActiveByCategorySection
        reportsDict={r}
        dashboardDict={d}
        activeSessionsByCategory={snapshot.activeSessionsByCategory}
      />

      <ReportsLiveOpsSection reportsDict={r} dashboardDict={d} snapshot={snapshot} />

      <ReportsMonthlyPanels reportsDict={r} dashboardDict={d} snapshot={snapshot} />
    </div>
  );
}
