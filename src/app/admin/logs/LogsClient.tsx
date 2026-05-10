"use client";

import { useState } from "react";
import { TerminalSquare, RefreshCcw } from "lucide-react";
import { useRouter } from "next/navigation";

type LogItem = {
  id: number;
  userId: number | null;
  level: string;
  message: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  workerName: string | null;
};

export default function LogsClient({ initialLogs: logs, workers }: { initialLogs: LogItem[], workers: { id: number, fullName: string }[] }) {
  const [filterUserId, setFilterUserId] = useState<number | 'ALL'>('ALL');
  const [filterLevel, setFilterLevel] = useState<string>('ALL');
  const router = useRouter();

  const filteredLogs = logs.filter(log => {
    if (filterUserId !== 'ALL' && log.userId !== filterUserId) return false;
    if (filterLevel !== 'ALL' && log.level !== filterLevel) return false;
    return true;
  });

  const getLevelColor = (level: string) => {
    switch(level) {
      case 'ERROR': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'WARN': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      case 'DEBUG': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      default: return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm flex flex-col h-[70vh]">
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <select 
            value={filterUserId} 
            onChange={e => setFilterUserId(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
            className="text-sm border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 py-1.5 px-3 focus:ring-emerald-500 focus:border-emerald-500"
          >
            <option value="ALL">Wszyscy pracownicy</option>
            {workers.map(w => (
              <option key={w.id} value={w.id}>{w.fullName}</option>
            ))}
          </select>
          <select 
            value={filterLevel} 
            onChange={e => setFilterLevel(e.target.value)}
            className="text-sm border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 py-1.5 px-3 focus:ring-emerald-500 focus:border-emerald-500"
          >
            <option value="ALL">Wszystkie logi</option>
            <option value="INFO">INFO</option>
            <option value="WARN">WARN</option>
            <option value="ERROR">ERROR</option>
            <option value="DEBUG">DEBUG</option>
          </select>
        </div>
        <button 
          onClick={() => router.refresh()}
          className="flex items-center justify-center gap-2 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg transition-colors text-sm font-medium"
        >
          <RefreshCcw className="w-4 h-4" /> Odśwież
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 bg-zinc-950 font-mono text-xs sm:text-sm custom-scrollbar relative">
        {filteredLogs.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-600">
            <TerminalSquare className="w-12 h-12 mb-3 opacity-20" />
            <p>Brak logów dla wybranych filtrów.</p>
          </div>
        ) : (
          <div className="space-y-0.5 whitespace-pre-wrap selection:bg-emerald-500/30">
            {filteredLogs.map(log => (
              <div key={log.id} className="hover:bg-white/5 px-2 py-0.5 rounded transition-colors break-words">
                <span className="text-zinc-500">[{new Date(log.createdAt).toLocaleString('pl-PL')}]</span>
                <span className={`mx-2 font-bold rounded border px-1 ${getLevelColor(log.level)}`}>
                  [{log.level}]
                </span>
                {log.workerName && <span className="mr-2 text-zinc-300">[{log.workerName}]</span>}
                <span className="text-zinc-100">{log.message}</span>
                {log.metadata && <span className="text-zinc-500 ml-2">{JSON.stringify(log.metadata)}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
