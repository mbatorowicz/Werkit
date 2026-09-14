"use client";

import { Camera, ChevronDown, ChevronUp, Clock, FileText } from "lucide-react";
import Image from "next/image";
import { formatUiTimeHm } from "@/i18n";
import { INLINE_SCROLL_PANEL_CLASS } from "@/components/scrollPanelStyles";
import { CARD } from "@/lib/uiTokens";
import { TIMELINE_ICON_NOTE, TIMELINE_ICON_PHOTO, TIMELINE_SELECTED } from "@/lib/uiChrome";
import { cn } from "@/lib/cn";
import type { TimelineItem } from "@/types/worker";

type Props = {
  timelineEvents: TimelineItem[];
  isTimelineOpen: boolean;
  setIsTimelineOpen: (val: boolean) => void;
  selectedEventId: string | null;
  /** Etykieta przycisku zwijania (np. z liczbą wpisów) — bez zmiany copy względem poprzedniego dashboardu. */
  timelineToggleLabel: string;
};

/**
 * Zwraca URL zdjęcia do wyświetlenia.
 * Dla zdjęć z Vercel Blob (private store) serwis zwraca presigned URL (refreshBlobUrl).
 * Dla starych data URL-i używamy bezpośredniego URL.
 */
function getPhotoSrc(item: TimelineItem): string {
  return item.content;
}

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
        <div
          className={`mt-2 flex max-h-[300px] flex-col gap-4 p-4 shadow-inner relative scroll-smooth ${CARD} ${INLINE_SCROLL_PANEL_CLASS}`}
        >
          {timelineEvents.map((item, index) => (
            <div
              key={item.id}
              id={item.id}
              className={cn(
                "relative flex gap-3 transition-all",
                selectedEventId === item.id && TIMELINE_SELECTED
              )}
            >
              {index < timelineEvents.length - 1 && (
                <div className="absolute left-[11px] top-6 bottom-[-16px] w-[2px] bg-zinc-200 dark:bg-zinc-700" />
              )}
              <div
                className={cn(
                  "z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                  item.type === "photo" ? TIMELINE_ICON_PHOTO : TIMELINE_ICON_NOTE
                )}
              >
                {item.type === "photo" ? (
                  <Camera className="w-3 h-3" />
                ) : (
                  <FileText className="w-3 h-3" />
                )}
              </div>
              <div className="flex-1 pb-2">
                <div className="text-[10px] text-zinc-400 mb-1">
                  {formatUiTimeHm(item.createdAt)}
                </div>
                {item.type === "photo" ? (
                  <div className="w-16 h-16 rounded overflow-hidden border border-zinc-200 dark:border-zinc-700">
                    <Image
                      src={getPhotoSrc(item)}
                      alt=""
                      width={64}
                      height={64}
                      unoptimized
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="text-sm text-zinc-700 dark:text-zinc-300 break-words">
                    {item.content}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
