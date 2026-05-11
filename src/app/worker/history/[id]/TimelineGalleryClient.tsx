"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { AppDictionary } from "@/i18n/types";
import { DEFAULT_UI_LOCALE } from "@/i18n/constants";

type TimelineEntry = {
  id: string;
  type: "photo" | "note";
  createdAt: string;
  content: string;
};

type HistoryLabels = AppDictionary["worker"]["history"];

export function TimelineGalleryClient({
  entries,
  labels,
}: {
  entries: TimelineEntry[];
  labels: HistoryLabels;
}) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const photoEntries = useMemo(
    () => entries.filter((e) => e.type === "photo" && e.content.trim() !== ""),
    [entries],
  );

  const close = useCallback(() => setLightboxIndex(null), []);

  const goPrev = useCallback(() => {
    setLightboxIndex((idx) => {
      if (idx === null) return idx;
      return (idx - 1 + photoEntries.length) % photoEntries.length;
    });
  }, [photoEntries.length]);

  const goNext = useCallback(() => {
    setLightboxIndex((idx) => {
      if (idx === null) return idx;
      return (idx + 1) % photoEntries.length;
    });
  }, [photoEntries.length]);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lightboxIndex, close, goPrev, goNext]);

  return (
    <>
      <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-3 mt-8">{labels.timelineTitle}</h3>
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 flex flex-col gap-4 shadow-sm">
        {entries.map((item, index) => {
          const timeLabel = new Date(item.createdAt).toLocaleString(DEFAULT_UI_LOCALE);
          const isPhoto = item.type === "photo";
          const photoIdx = isPhoto ? photoEntries.findIndex((p) => p.id === item.id) : -1;

          return (
            <div key={item.id} className="flex gap-3 relative">
              {index < entries.length - 1 && (
                <div className="absolute left-[11px] top-6 bottom-[-16px] w-[2px] bg-zinc-200 dark:bg-zinc-700" />
              )}
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 ${
                  isPhoto
                    ? "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400"
                    : "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400"
                }`}
              >
                {isPhoto ? (
                  <span className="text-[10px] font-black">{labels.badgePhoto}</span>
                ) : (
                  <span className="text-[10px] font-black">{labels.badgeNote}</span>
                )}
              </div>
              <div className="flex-1 pb-2">
                <div className="text-[10px] text-zinc-400 mb-1">{timeLabel}</div>
                {isPhoto ? (
                  <button
                    type="button"
                    className="w-28 h-28 rounded overflow-hidden border border-zinc-200 dark:border-zinc-700 mt-1 block"
                    onClick={() => {
                      if (photoIdx >= 0) setLightboxIndex(photoIdx);
                    }}
                    title={labels.expandPhotoTitle}
                  >
                    <Image
                      src={item.content}
                      alt={labels.photoThumbAlt}
                      width={112}
                      height={112}
                      unoptimized
                      className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                    />
                  </button>
                ) : (
                  <div className="text-sm text-zinc-700 dark:text-zinc-300 break-words bg-zinc-50 dark:bg-zinc-800 p-2 rounded mt-1">
                    {item.content}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {lightboxIndex !== null && photoEntries.length > 0 ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={close} />
          <div className="relative z-10 w-full max-w-5xl">
            <div className="absolute right-2 top-2 flex items-center gap-2 z-20">
              <div className="text-[11px] font-mono text-white/80 bg-black/40 border border-white/10 px-2 py-1 rounded">
                {lightboxIndex + 1}/{photoEntries.length}
              </div>
              <button
                type="button"
                onClick={close}
                className="p-2 rounded-lg bg-black/40 hover:bg-black/60 border border-white/10 text-white transition"
                title={labels.closeGallery}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] bg-black/30 border border-white/10 rounded-xl overflow-hidden">
              <Image
                src={photoEntries[lightboxIndex]?.content ?? ""}
                alt={labels.photoLightboxAlt}
                fill
                unoptimized
                className="object-contain"
              />
            </div>

            {photoEntries.length > 1 ? (
              <>
                <button
                  type="button"
                  onClick={goPrev}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-black/40 hover:bg-black/60 border border-white/10 text-white transition"
                  title={labels.prevPhoto}
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-black/40 hover:bg-black/60 border border-white/10 text-white transition"
                  title={labels.nextPhoto}
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
