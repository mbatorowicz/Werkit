"use client";

import { useDictionary } from "@/components/LocaleProvider";
import { SURFACE_MUTED, TEXT_MUTED } from "@/lib/uiTokens";
import { cn } from "@/lib/cn";

export function MapLoadingFallback() {
  const dict = useDictionary();
  return (
    <div
      className={cn(
        "w-full h-full animate-pulse rounded-lg flex items-center justify-center text-xs font-medium",
        SURFACE_MUTED,
        TEXT_MUTED
      )}
    >
      {dict.common.map.loading}
    </div>
  );
}
