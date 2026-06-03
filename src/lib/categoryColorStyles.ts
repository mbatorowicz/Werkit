import type { CSSProperties } from "react";

/** Domyślny kolor badge, gdy kategoria nie ma `color` w bazie. */
export const DEFAULT_CATEGORY_COLOR = "#71717a";

export function resolveCategoryColor(color: string | null | undefined): string {
  const trimmed = typeof color === "string" ? color.trim() : "";
  return trimmed || DEFAULT_CATEGORY_COLOR;
}

/** Style inline badge kategorii — SSOT dla całej aplikacji. */
export function categoryColorBadgeStyle(color: string | null | undefined): CSSProperties {
  const hex = resolveCategoryColor(color);
  return {
    backgroundColor: `${hex}1a`,
    color: hex,
    borderColor: `${hex}33`,
  };
}

export const CATEGORY_COLOR_BADGE_BASE_CLASS = "rounded-md border font-semibold";

export const CATEGORY_COLOR_BADGE_SIZE_CLASS = {
  sm: "px-2 py-0.5 text-[10px] uppercase tracking-wider",
  md: "px-2 py-0.5 text-xs",
} as const;
