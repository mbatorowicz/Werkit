"use client";

import { Camera, ChevronDown, ChevronUp, Clock, FileText } from "lucide-react";
import Image from "next/image";
import { formatUiTimeHm } from "@/i18n";
import type { TimelineItem } from "@/types/worker";

type Props = {
  timelineEvents: TimelineItem[];
  isTimelineOpen: boolean;
  setIsTimelineOpen: (val: boolean) => void;
  selectedEventId: string | null;
  /** Etykieta przycisku zwijania (np. z liczbą wpisów) — bez zmiany copy względem poprzedniego dashboardu. */
  timelineToggleLabel: string;
};

export function ActiveSessionTimelinePanel({
  timelineEvents,
  isTimelineOpen,
  setIsTimelineOpen,
  selectedEventId,
  timelineToggleLabel,
}: Props) {
  if (timelineEvents.length === 0) return null;

  return (
    <div className="w-full mt-2">
      <button
        type="button"
        onClick={() => setIsTimelineOpen(!isTimelineOpen)}
        className="w-full bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-3 flex items-center justify-between transition-colors"
      >
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-zinc-500" />
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
            {timelineToggleLabel}
          </span>
        </div>
        {isTimelineOpen ? (
          <ChevronUp className="w-4 h-4 text-zinc-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-zinc-400" />
        )}
      </button>

      {isTimelineOpen && (
        <div className="mt-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 max-h-[300px] overflow-y-auto flex flex-col gap-4 shadow-inner relative scroll-smooth">
          {timelineEvents.map((item, index) => (
            <div
              key={item.id}
              id={item.id}
              className={`flex gap-3 relative ${
                selectedEventId === item.id ? "bg-blue-50 dark:bg-blue-500/10 p-2 -mx-2 rounded-lg" : ""
              } transition-all`}
            >
              {index < timelineEvents.length - 1 && (
                <div className="absolute left-[11px] top-6 bottom-[-16px] w-[2px] bg-zinc-200 dark:bg-zinc-700" />
              )}
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 ${
                  item.type === "photo"
                    ? "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400"
                    : "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400"
                }`}
              >
                {item.type === "photo" ? <Camera className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
              </div>
              <div className="flex-1 pb-2">
                <div className="text-[10px] text-zinc-400 mb-1">{formatUiTimeHm(item.createdAt)}</div>
                {item.type === "photo" ? (
                  <div className="w-16 h-16 rounded overflow-hidden border border-zinc-200 dark:border-zinc-700">
                    <Image
                      src={item.content}
                      alt=""
                      width={64}
                      height={64}
                      unoptimized
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="text-sm text-zinc-700 dark:text-zinc-300 break-words">{item.content}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
