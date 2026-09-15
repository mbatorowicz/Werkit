"use client";

import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, User, Truck } from "lucide-react";
import { DateInput } from "@/components/DateInput";
import { cn } from "@/lib/cn";
import { ICON_HIT } from "@/lib/uiTokens";

type Props = {
  groupBy: "WORKER" | "MACHINE";
  setGroupBy: (v: "WORKER" | "MACHINE") => void;
  startHour: number;
  endHour: number;
  setStartHour: (v: number) => void;
  setEndHour: (v: number) => void;
  selectedDateStr: string;
  setSelectedDateStr: (v: string) => void;
  onPrevDay: () => void;
  onNextDay: () => void;
  dict: Record<string, string>;
  variant?: "default" | "compact";
  leading?: ReactNode;
  trailing?: ReactNode;
  showHourRange?: boolean;
};

export function GanttHeader({
  groupBy,
  setGroupBy,
  startHour,
  endHour,
  setStartHour,
  setEndHour,
  selectedDateStr,
  setSelectedDateStr,
  onPrevDay,
  onNextDay,
  dict,
  variant = "default",
  leading,
  trailing,
  showHourRange = true,
}: Props) {
  const compact = variant === "compact";

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950/80",
        compact ? "p-2" : "flex-col items-start gap-4 p-4 md:flex-row md:items-center"
      )}
    >
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {leading}
        <div className="flex items-center rounded-lg border border-zinc-200 bg-white p-1 dark:border-zinc-700 dark:bg-zinc-800">
          <button
            type="button"
            onClick={() => setGroupBy("WORKER")}
            className={cn(
              "flex items-center gap-2 rounded-md text-sm font-medium transition",
              compact ? "px-2.5 py-1.5" : "px-4 py-1.5",
              groupBy === "WORKER"
                ? "bg-amber-100 text-amber-800 shadow-sm dark:bg-amber-500/20 dark:text-amber-500"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
            )}
          >
            <User className="h-4 w-4" /> {dict.groupByWorker}
          </button>
          <button
            type="button"
            onClick={() => setGroupBy("MACHINE")}
            className={cn(
              "flex items-center gap-2 rounded-md text-sm font-medium transition",
              compact ? "px-2.5 py-1.5" : "px-4 py-1.5",
              groupBy === "MACHINE"
                ? "bg-amber-100 text-amber-800 shadow-sm dark:bg-amber-500/20 dark:text-amber-500"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
            )}
          >
            <Truck className="h-4 w-4" /> {dict.groupByResource}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:gap-4">
        {showHourRange ? (
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-zinc-500">{dict.hourFrom ?? "Od:"}</label>
            <input
              type="number"
              min="0"
              max={endHour - 1}
              value={startHour}
              onChange={(e) =>
                setStartHour(Math.min(endHour - 1, Math.max(0, parseInt(e.target.value) || 0)))
              }
              className="w-16 rounded border border-zinc-200 bg-white px-2 py-1 text-sm font-medium text-zinc-900 outline-none focus:ring-1 focus:ring-amber-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            />
            <label className="text-xs font-medium text-zinc-500">{dict.hourTo ?? "Do:"}</label>
            <input
              type="number"
              min={startHour + 1}
              max="24"
              value={endHour}
              onChange={(e) =>
                setEndHour(Math.max(startHour + 1, Math.min(24, parseInt(e.target.value) || 24)))
              }
              className="w-16 rounded border border-zinc-200 bg-white px-2 py-1 text-sm font-medium text-zinc-900 outline-none focus:ring-1 focus:ring-amber-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            />
          </div>
        ) : null}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPrevDay}
            aria-label={dict.prevDay ?? "Poprzedni dzień"}
            className={cn(
              ICON_HIT,
              "rounded border border-zinc-200 bg-white text-zinc-500 shadow-sm transition hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:hover:text-white"
            )}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <DateInput
            variant="compact"
            value={selectedDateStr}
            onChange={setSelectedDateStr}
            aria-label={dict.date}
          />
          <button
            type="button"
            onClick={onNextDay}
            aria-label={dict.nextDay ?? "Następny dzień"}
            className={cn(
              ICON_HIT,
              "rounded border border-zinc-200 bg-white text-zinc-500 shadow-sm transition hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:hover:text-white"
            )}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        {trailing}
      </div>
    </div>
  );
}
