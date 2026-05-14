"use client";

import { useState } from "react";
import { TerminalSquare, RefreshCcw, Download } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatDict, formatUiDateTimeShort } from "@/i18n/format";
import type { AppDictionary } from "@/i18n/types";
import type { WerkitLogCategory } from "@/types/deviceTelemetry";
import { fetchWithDeviceTelemetry } from "@/lib/fetchWithDeviceTelemetry";

const LOG_CATEGORIES: WerkitLogCategory[] = [
  "http",
  "gps",
  "session",
  "orders",
  "notifications",
  "lifecycle",
  "ui",
  "errors",
  "unknown",
  "admin",
  "auth",
  "profile",
];

type LogItem = {
  id: number;
  userId: number | null;
  level: string;
  message: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  workerName: string | null;
};

type LogsDict = AppDictionary["admin"]["logs"];

function getLogCategory(metadata: Record<string, unknown> | null | undefined): WerkitLogCategory | undefined {
  if (!metadata) return undefined;
  const top = metadata.category;
  if (typeof top === "string") return top as WerkitLogCategory;
  const wc = metadata.werkitContext;
  if (wc && typeof wc === "object" && !Array.isArray(wc)) {
    const c = (wc as Record<string, unknown>).category;
    if (typeof c === "string") return c as WerkitLogCategory;
  }
  return undefined;
}

function summarizeTelemetryLine(metadata: Record<string, unknown> | null | undefined): string | null {
  if (!metadata) return null;
  const parts: string[] = [];
  const cat = getLogCategory(metadata);
  if (cat) parts.push(cat);

  const wc = metadata.werkitContext;
  if (wc && typeof wc === "object" && !Array.isArray(wc)) {
    const wco = wc as Record<string, unknown>;
    const client = wco.client;
    if (client && typeof client === "object" && !Array.isArray(client)) {
      const c = client as Record<string, unknown>;
      if (typeof c.appVersion === "string") parts.push(`app ${c.appVersion}`);
      if (typeof c.platform === "string") parts.push(c.platform);
      if (typeof c.path === "string") parts.push(c.path);
      if (typeof c.correlationId === "string") {
        const id = c.correlationId;
        parts.push(id.length > 12 ? `trace ${id.slice(0, 12)}…` : `trace ${id}`);
      }
      if (c.online === false) parts.push("offline");
      if (typeof c.connEffectiveType === "string") parts.push(`net ${c.connEffectiveType}`);
    }
    const server = wco.server;
    if (server && typeof server === "object" && !Array.isArray(server)) {
      const s = server as Record<string, unknown>;
      if (typeof s.region === "string" && s.region) parts.push(`edge ${s.region}`);
    }
  }

  if (typeof metadata.status === "number") parts.push(`HTTP ${metadata.status}`);
  if (typeof metadata.url === "string" && metadata.url.length > 0) {
    const u = metadata.url.length > 96 ? `${metadata.url.slice(0, 96)}…` : metadata.url;
    parts.push(u);
  }

  return parts.length ? parts.join(" · ") : null;
}

function hasMetadataPayload(metadata: Record<string, unknown> | null | undefined): boolean {
  if (!metadata) return false;
  return Object.keys(metadata).length > 0;
}

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

  const handleExportJson = async () => {
    setExporting(true);
    try {
      const res = await fetchWithDeviceTelemetry("Admin logs: export JSON", "/api/admin/logs/export", {
        credentials: "same-origin",
      }, { category: "admin" });
      if (!res.ok) {
        window.alert(logsDict.exportJsonError);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      a.download = `werkit-device-logs-${stamp}.json`;
      a.rel = "noopener";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      window.alert(logsDict.exportJsonError);
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

  const getLevelColor = (level: string) => {
    switch (level) {
      case "ERROR":
        return "text-red-500 bg-red-500/10 border-red-500/20";
      case "WARN":
        return "text-amber-500 bg-amber-500/10 border-amber-500/20";
      case "DEBUG":
        return "text-blue-500 bg-blue-500/10 border-blue-500/20";
      default:
        return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm flex flex-col h-[70vh]">
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterUserId}
            onChange={(e) => setFilterUserId(e.target.value === "ALL" ? "ALL" : Number(e.target.value))}
            className="text-sm border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 py-1.5 px-3 focus:ring-emerald-500 focus:border-emerald-500"
          >
            <option value="ALL">{logsDict.filterAllWorkers}</option>
            {workers.map((w) => (
              <option key={w.id} value={w.id}>
                {w.fullName}
              </option>
            ))}
          </select>
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            className="text-sm border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 py-1.5 px-3 focus:ring-emerald-500 focus:border-emerald-500"
          >
            <option value="ALL">{logsDict.filterAllLevels}</option>
            <option value="INFO">INFO</option>
            <option value="WARN">WARN</option>
            <option value="ERROR">ERROR</option>
            <option value="DEBUG">DEBUG</option>
          </select>
          <select
            value={filterCategory}
            onChange={(e) =>
              setFilterCategory(e.target.value === "ALL" ? "ALL" : (e.target.value as WerkitLogCategory))
            }
            className="text-sm border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 py-1.5 px-3 focus:ring-emerald-500 focus:border-emerald-500 max-w-[11rem]"
          >
            <option value="ALL">{logsDict.filterAllCategories}</option>
            {LOG_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <button
            type="button"
            title={exportHint}
            disabled={exporting}
            onClick={() => void handleExportJson()}
            className="flex items-center justify-center gap-2 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-60 disabled:pointer-events-none text-zinc-700 dark:text-zinc-300 rounded-lg transition-colors text-sm font-medium"
          >
            <Download className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            {exporting ? logsDict.exportJsonLoading : logsDict.exportJson}
          </button>
          <button
            type="button"
            onClick={() => router.refresh()}
            className="flex items-center justify-center gap-2 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg transition-colors text-sm font-medium"
          >
            <RefreshCcw className="w-4 h-4 shrink-0" /> {logsDict.refresh}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 bg-zinc-950 font-mono text-xs sm:text-sm custom-scrollbar relative">
        {filteredLogs.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-600">
            <TerminalSquare className="w-12 h-12 mb-3 opacity-20" />
            <p>{logsDict.emptyFiltered}</p>
          </div>
        ) : (
          <div className="space-y-2 selection:bg-emerald-500/30">
            {filteredLogs.map((log) => {
              const summary = summarizeTelemetryLine(log.metadata);
              const expanded = expandedId === log.id;
              const hasPayload = hasMetadataPayload(log.metadata);
              return (
                <div
                  key={log.id}
                  className="hover:bg-white/5 px-2 py-1.5 rounded transition-colors break-words border border-transparent hover:border-zinc-800/80"
                >
                  <div className="whitespace-pre-wrap">
                    <span className="text-zinc-500">[{formatUiDateTimeShort(log.createdAt)}]</span>
                    <span className={`mx-2 font-bold rounded border px-1 ${getLevelColor(log.level)}`}>
                      [{log.level}]
                    </span>
                    {log.workerName && <span className="mr-2 text-zinc-300">[{log.workerName}]</span>}
                    <span className="text-zinc-100">{log.message}</span>
                  </div>
                  {summary && (
                    <div className="mt-1 text-[11px] sm:text-xs text-zinc-500 pl-0 sm:pl-1 leading-snug">{summary}</div>
                  )}
                  {hasPayload && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        aria-expanded={expanded}
                        onClick={() => setExpandedId(expanded ? null : log.id)}
                        className="text-[11px] sm:text-xs font-sans rounded border border-zinc-700 px-2 py-0.5 text-zinc-300 hover:bg-zinc-800/80"
                      >
                        {expanded ? logsDict.hideFullPayload : logsDict.showFullPayload}
                      </button>
                    </div>
                  )}
                  {expanded && log.metadata && (
                    <pre className="mt-2 max-h-64 overflow-auto rounded bg-black/40 p-2 text-[11px] leading-relaxed text-zinc-400 border border-zinc-800/60 whitespace-pre-wrap break-words">
                      {JSON.stringify(log.metadata, null, 2)}
                    </pre>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
