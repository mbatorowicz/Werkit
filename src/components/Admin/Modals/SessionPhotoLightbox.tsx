"use client";

import { X, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { INLINE_SCROLL_X_PANEL_CLASS } from "@/components/scrollPanelStyles";
import { formatDict } from "@/i18n/format";

interface SessionPhotoLightboxProps {
  photos: string[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
  dict: {
    lightboxCounter: string;
    lightboxPrevPhoto: string;
    lightboxNextPhoto: string;
    lightboxThumbnailAlt: string;
    enlargedPhoto: string;
  };
  adminUi: {
    closeModal: string;
  };
}

export default function SessionPhotoLightbox({
  photos,
  currentIndex,
  onClose,
  onNavigate,
  dict,
  adminUi,
}: SessionPhotoLightboxProps) {
  if (currentIndex === null || currentIndex < 0) return null;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-black/95 backdrop-blur-md">
      <div className="z-10 flex items-center justify-between p-4 text-white/50">
        <div className="text-sm font-medium tracking-widest">
          {formatDict(dict.lightboxCounter, { current: currentIndex + 1, total: photos.length })}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-2 transition hover:bg-white/10 hover:text-white"
          aria-label={adminUi.closeModal}
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-12">
        <Image
          src={photos[currentIndex] ?? ""}
          alt={dict.enlargedPhoto}
          width={1200}
          height={900}
          unoptimized
          className="max-h-full max-w-full animate-in fade-in zoom-in-95 object-contain shadow-2xl duration-300"
        />

        {photos.length > 1 ? (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onNavigate(currentIndex > 0 ? currentIndex - 1 : photos.length - 1);
              }}
              className="absolute left-4 top-1/2 flex -translate-y-1/2 rounded-full bg-white/10 p-3 text-white backdrop-blur-md transition hover:bg-white/20"
              aria-label={dict.lightboxPrevPhoto}
            >
              <ChevronLeft className="h-6 w-6" strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onNavigate(currentIndex < photos.length - 1 ? currentIndex + 1 : 0);
              }}
              className="absolute right-4 top-1/2 flex -translate-y-1/2 rounded-full bg-white/10 p-3 text-white backdrop-blur-md transition hover:bg-white/20"
              aria-label={dict.lightboxNextPhoto}
            >
              <ChevronRight className="h-6 w-6" strokeWidth={2} />
            </button>
          </>
        ) : null}
      </div>

      <div className={`z-10 flex h-24 items-center justify-center gap-2 bg-black/50 p-4 ${INLINE_SCROLL_X_PANEL_CLASS}`}>
        {photos.map((url, idx) => (
          <Image
            key={url}
            src={url}
            alt={formatDict(dict.lightboxThumbnailAlt, { n: idx + 1 })}
            width={64}
            height={64}
            unoptimized
            className={`h-16 w-16 cursor-pointer rounded object-cover transition-all ${
              idx === currentIndex ? "scale-110 border-2 border-amber-500 opacity-100" : "opacity-40 hover:opacity-100"
            }`}
            onClick={() => onNavigate(idx)}
          />
        ))}
      </div>
    </div>
  );
}
