"use client";

import { formatUiDateTimeShort } from "@/i18n/format";
import {
  getLevelColor,
  hasMetadataPayload,
  summarizeTelemetryLine,
  type LogItem,
  type LogsDict,
} from "./logsView";

interface LogRowProps {
  log: LogItem;
  logsDict: LogsDict;
  expanded: boolean;
  onToggleExpanded: () => void;
}

export function LogRow({ log, logsDict, expanded, onToggleExpanded }: LogRowProps) {
  const summary = summarizeTelemetryLine(log.metadata, logsDict);
  const hasPayload = hasMetadataPayload(log.metadata);

  return (
    <div className="hover:bg-white/5 px-2 py-1.5 rounded transition-colors break-words border border-transparent hover:border-zinc-800/80">
      <div className="whitespace-pre-wrap">
        <span className="text-zinc-500">[{formatUiDateTimeShort(log.createdAt)}]</span>
        <span className={`mx-2 font-bold rounded border px-1 ${getLevelColor(log.level)}`}>
          [{log.level}]
        </span>
        {log.workerName && <span className="mr-2 text-zinc-300">[{log.workerName}]</span>}
        <span className="text-zinc-100">{log.message}</span>
      </div>
      {summary && (
        <div className="mt-1 text-[11px] sm:text-xs text-zinc-500 pl-0 sm:pl-1 leading-snug">
          {summary}
        </div>
      )}
      {hasPayload && (
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-expanded={expanded}
            onClick={onToggleExpanded}
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
}
