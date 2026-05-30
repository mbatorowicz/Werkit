"use client";

import { Maximize2 } from "lucide-react";

interface MapControlsProps {
  thumbnail: boolean;
  headingKnown: boolean;
  showHeadingNeedle: boolean;
  showResumeFollow: boolean;
  onToggleFullscreen: () => void;
  onToggleHeadingNeedle: () => void;
  onResumeFollow: () => void;
  dict: {
    fullscreen: string;
    headingOn: string;
    headingOff: string;
    followResume: string;
  };
}

export function MapControls({
  thumbnail,
  headingKnown,
  showHeadingNeedle,
  showResumeFollow,
  onToggleFullscreen,
  onToggleHeadingNeedle,
  onResumeFollow,
  dict,
}: MapControlsProps) {
  return (
    <>
      {/* Przycisk pełnego ekranu — zawsze widoczny */}
      <button
        type="button"
        onClick={onToggleFullscreen}
        className="absolute top-3 right-3 z-[1000] bg-white/90 dark:bg-zinc-800/90 text-zinc-700 dark:text-zinc-300 px-3 py-1.5 rounded-full shadow-lg text-xs font-medium border border-zinc-200 dark:border-zinc-700 transition hover:bg-white dark:hover:bg-zinc-700 active:scale-95 flex items-center gap-1.5 backdrop-blur-sm"
      >
        <Maximize2 className="h-3.5 w-3.5" />
        {dict.fullscreen}
      </button>

      {/* W trybie thumbnail ukrywamy przyciski kierunku i śledzenia — mapa ożywa dopiero na pełnym ekranie */}
      {!thumbnail && headingKnown ? (
        <button
          type="button"
          onClick={onToggleHeadingNeedle}
          className="absolute bottom-6 right-4 z-[1000] bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white px-4 py-2 rounded-full shadow-lg font-medium text-xs border border-zinc-200 dark:border-zinc-700 transition active:scale-95"
        >
          {showHeadingNeedle ? dict.headingOn : dict.headingOff}
        </button>
      ) : null}

      {!thumbnail && showResumeFollow ? (
        <button
          type="button"
          onClick={onResumeFollow}
          className="absolute bottom-6 left-4 z-[1000] bg-emerald-600 text-white px-4 py-2 rounded-full shadow-lg font-medium text-xs border border-emerald-500 transition active:scale-95 hover:bg-emerald-500"
        >
          {dict.followResume}
        </button>
      ) : null}
    </>
  );
}
