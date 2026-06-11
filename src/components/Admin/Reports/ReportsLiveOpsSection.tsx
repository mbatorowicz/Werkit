import LiveMap from "@/components/Map/LiveMap";
import { MapPin } from "lucide-react";
import type { AppDictionary } from "@/i18n/types";
import type { ReportsDashboardSnapshot } from "@/types/admin";
import { formatUiTimeHm } from "@/i18n";
import { INLINE_SCROLL_X_PANEL_CLASS } from "@/components/scrollPanelStyles";
import {
  TABLE_BODY_ROW,
  TABLE_CELL_NAME,
  TABLE_EMPTY_CELL,
  TABLE_HEAD,
  TABLE_HEAD_ROW,
  TABLE_TD,
  TABLE_TD_MUTED,
  TABLE_TH,
} from "@/lib/uiTable";

export interface ReportsLiveOpsSectionProps {
  reportsDict: AppDictionary["admin"]["reports"];
  dashboardDict: AppDictionary["admin"]["dashboard"];
  snapshot: ReportsDashboardSnapshot;
}

export function ReportsLiveOpsSection({
  reportsDict: r,
  dashboardDict: d,
  snapshot,
}: ReportsLiveOpsSectionProps) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2 space-y-6">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg flex flex-col overflow-hidden shadow-sm">
          <div className="px-6 py-5 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950/50">
            <h2 className="font-semibold text-zinc-900 dark:text-white">
              {r.activeEquipmentTitle}
            </h2>
          </div>

          <div className={INLINE_SCROLL_X_PANEL_CLASS}>
            <table className="w-full min-w-[600px] border-collapse text-left">
              <thead className={TABLE_HEAD}>
                <tr className={TABLE_HEAD_ROW}>
                  <th className={TABLE_TH}>{d.whoAndWhere}</th>
                  <th className={TABLE_TH}>{d.equipment}</th>
                  <th className={TABLE_TH}>{d.startTime}</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.activeSessions.map((session) => (
                  <tr key={session.id} className={TABLE_BODY_ROW}>
                    <td className={TABLE_TD}>
                      <div className={TABLE_CELL_NAME}>{session.userName}</div>
                      <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        {session.taskDescription || "—"}{" "}
                        {session.quantityTons ? `(${session.quantityTons} t)` : ""}
                      </div>
                    </td>
                    <td className={`${TABLE_TD} font-medium text-amber-600 dark:text-amber-400`}>
                      {session.resourceName ?? "—"}
                    </td>
                    <td className={TABLE_TD_MUTED}>{formatUiTimeHm(session.startTime)}</td>
                  </tr>
                ))}
                {snapshot.activeSessions.length === 0 ? (
                  <tr>
                    <td colSpan={3} className={TABLE_EMPTY_CELL}>
                      {d.noActiveSessions}
                    </td>
                  </tr>
                ) : null}
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
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 drop-shadow-md">
              {d.detectedProviders}
            </p>
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
  );
}
