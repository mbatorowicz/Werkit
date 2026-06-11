"use client";

import { createPortal } from "react-dom";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { AppDictionary } from "@/i18n/types";

type HistoryLabels = AppDictionary["worker"]["history"];

type PhotoEntry = {
  id: string;
  content: string;
};

/** Nad warstwami Leaflet (pane ~400+) i kontrolkami LiveMap (np. z-[1000]). */
const LIGHTBOX_Z = "z-[10050]";

export function TimelineLightbox({
  photoEntries,
  lightboxIndex,
  labels,
  onClose,
  onPrev,
  onNext,
}: {
  photoEntries: PhotoEntry[];
  lightboxIndex: number | null;
  labels: HistoryLabels;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  if (lightboxIndex === null || photoEntries.length === 0 || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className={`fixed inset-0 ${LIGHTBOX_Z} flex items-center justify-center p-4`}
      role="dialog"
      aria-modal="true"
      aria-label={labels.photoLightboxAlt}
    >
      <div className="absolute inset-0 bg-black/70" onClick={onClose} aria-hidden />
      <div className="relative z-10 w-full max-w-5xl">
        <div className="absolute right-2 top-2 z-20 flex items-center gap-2">
          <div className="rounded border border-white/10 bg-black/40 px-2 py-1 font-mono text-[11px] text-white/80">
            {lightboxIndex + 1}/{photoEntries.length}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 bg-black/40 p-2 text-white transition hover:bg-black/60"
            title={labels.closeGallery}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-white/10 bg-black/30 sm:aspect-[16/10]">
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
              onClick={onPrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-lg border border-white/10 bg-black/40 p-2 text-white transition hover:bg-black/60"
              title={labels.prevPhoto}
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              type="button"
              onClick={onNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg border border-white/10 bg-black/40 p-2 text-white transition hover:bg-black/60"
              title={labels.nextPhoto}
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
