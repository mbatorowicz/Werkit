import type { CSSProperties } from "react";

/** Wspólne przewijanie list w layoucie (worker/admin, modale, rozwijane sekcje). */
export const INLINE_SCROLL_PANEL_CLASS =
  "overflow-y-auto overscroll-contain touch-pan-y custom-scrollbar";

/** Poziome przewijanie tabel i szerokich paneli (admin, Gantt). */
export const INLINE_SCROLL_X_PANEL_CLASS =
  "overflow-x-auto overscroll-x-contain touch-pan-x custom-scrollbar";

/** Panel listy combobox renderowany przez portal nad resztą UI. */
export const FLOATING_LISTBOX_PANEL_CLASS = [
  "fixed z-[200]",
  INLINE_SCROLL_PANEL_CLASS,
  "rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900",
].join(" ");

export function touchScrollStyle(maxHeight?: number): CSSProperties {
  return maxHeight != null ? { maxHeight } : {};
}
