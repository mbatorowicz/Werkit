"use client";

import { FileText, ImageIcon } from "lucide-react";
import Image from "next/image";
import { formatUiDateOnly, formatUiTimeHm } from "@/i18n/format";

interface TimelineEntry {
  type: "photo" | "note";
  id?: number;
  time: number;
  note?: string;
  photoUrl?: string;
  photoType?: string;
}

interface SessionTimelinePanelProps {
  items: TimelineEntry[];
  allPhotos: string[];
  onPhotoClick: (url: string) => void;
  dict: {
    timelineTitle: string;
    photoRoute: string;
    photoStart: string;
    photoEnd: string;
  };
}

export default function SessionTimelinePanel({
  items,
  allPhotos: _allPhotos,
  onPhotoClick,
  dict,
}: SessionTimelinePanelProps) {
  if (items.length === 0) return null;

  return (
    <div className="mt-8">
      <h3 className="mb-6 flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-white">
        <ImageIcon className="h-5 w-5 text-amber-500" /> {dict.timelineTitle}
      </h3>
      <div className="relative ml-4 space-y-8 border-l-2 border-zinc-200 dark:border-zinc-800">
        {items.map((entry) => {
          const isNote = entry.type === "note";
          const timeStr = formatUiTimeHm(entry.time);
          const dateStr = formatUiDateOnly(entry.time);

          return (
            <div key={`${entry.type}-${entry.id}`} className="relative flex w-full items-start">
              <div className="absolute -left-[9px] top-4 z-10 h-4 w-4 rounded-full border-4 border-zinc-50 bg-amber-500 dark:border-[#0a0a0b]" />

              <div className="w-full pl-6">
                <div className="max-w-2xl rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
                  <div className="mb-2 flex items-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    {isNote ? (
                      <FileText className="h-4 w-4 text-orange-500" />
                    ) : (
                      <ImageIcon className="h-4 w-4 text-purple-500" />
                    )}
                    {dateStr} {timeStr}
                  </div>
                  {isNote ? (
                    <p className="whitespace-pre-wrap text-sm text-zinc-900 dark:text-zinc-200">{entry.note ?? ""}</p>
                  ) : (
                    <>
                      <Image
                        src={entry.photoUrl ?? ""}
                        alt={dict.photoRoute}
                        width={800}
                        height={600}
                        unoptimized
                        className="mb-2 h-auto w-full cursor-pointer rounded-md object-cover transition-opacity hover:opacity-90"
                        onClick={() => {
                          const url = entry.photoUrl;
                          if (!url) return;
                          onPhotoClick(url);
                        }}
                      />
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-200">
                        {entry.photoType === "START"
                          ? dict.photoStart
                          : entry.photoType === "END"
                            ? dict.photoEnd
                            : dict.photoRoute}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
