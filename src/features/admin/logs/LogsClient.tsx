"use client";

import { useState } from "react";
import { TerminalSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatDict } from "@/i18n/format";
import type { WerkitLogCategory } from "@/types/deviceTelemetry";
import { fetchWithDeviceTelemetry } from "@/lib/fetchWithDeviceTelemetry";
import { useAppDialog } from "@/components/AppDialogProvider";
import { INLINE_SCROLL_PANEL_CLASS } from "@/components/scrollPanelStyles";
import { getLogCategory, type LogItem, type LogsDict } from "./logsView";
import { LogsFilterBar } from "./LogsFilterBar";
import { LogRow } from "./LogRow";

export default function LogsClient({
  initialLogs: logs,
  workers,
  logsDict,
  exportMaxRows,
}: {
  initialLogs: LogItem[];
  workers: { id: number; fullName: string }[];
  logsDict: LogsDict;
  exportMaxRows: number;
}) {
  const [filterUserId, setFilterUserId] = useState<number | "ALL">("ALL");
  const [filterLevel, setFilterLevel] = useState<string>("ALL");
  const [filterCategory, setFilterCategory] = useState<WerkitLogCategory | "ALL">("ALL");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);
  const router = useRouter();
  const { alert: appAlert } = useAppDialog();

  const handleExportJson = async () => {
    setExporting(true);
    try {
      const res = await fetchWithDeviceTelemetry(
        "Admin logs: export JSON",
        "/api/admin/logs/export",
        {
          credentials: "same-origin",
        },
        { category: "admin" }
      );
      if (!res.ok) {
        await appAlert({ message: logsDict.exportJsonError });
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      a.download = formatDict(logsDict.exportJsonFileName, { stamp });
      a.rel = "noopener";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      await appAlert({ message: logsDict.exportJsonError });
    } finally {
      setExporting(false);
    }
  };

  const exportHint = formatDict(logsDict.exportJsonHint, { max: exportMaxRows });

  const filteredLogs = logs.filter((log) => {
    if (filterUserId !== "ALL" && log.userId !== filterUserId) return false;
    if (filterLevel !== "ALL" && log.level !== filterLevel) return false;
    if (filterCategory !== "ALL") {
      const cat = getLogCategory(log.metadata ?? undefined);
      if (filterCategory === "unknown") {
        if (cat && cat !== "unknown") return false;
      } else if (cat !== filterCategory) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm flex flex-col h-[70vh]">
      <LogsFilterBar
        workers={workers}
        logsDict={logsDict}
        filterUserId={filterUserId}
        filterLevel={filterLevel}
        filterCategory={filterCategory}
        exporting={exporting}
        exportHint={exportHint}
        onFilterUserIdChange={setFilterUserId}
        onFilterLevelChange={setFilterLevel}
        onFilterCategoryChange={setFilterCategory}
        onExport={() => void handleExportJson()}
        onRefresh={() => router.refresh()}
      />

      <div
        className={`flex-1 p-4 bg-zinc-950 font-mono text-xs sm:text-sm relative ${INLINE_SCROLL_PANEL_CLASS}`}
      >
        {filteredLogs.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-600">
            <TerminalSquare className="w-12 h-12 mb-3 opacity-20" />
            <p>{logsDict.emptyFiltered}</p>
          </div>
        ) : (
          <div className="space-y-2 selection:bg-emerald-500/30">
            {filteredLogs.map((log) => (
              <LogRow
                key={log.id}
                log={log}
                logsDict={logsDict}
                expanded={expandedId === log.id}
                onToggleExpanded={() => setExpandedId(expandedId === log.id ? null : log.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
