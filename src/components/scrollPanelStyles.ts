import type { CSSProperties } from "react";
import { HORIZONTAL_SCROLL_PANEL_CLASS, VERTICAL_SCROLL_PANEL_CLASS } from "@/lib/uiScrollPanels";

/** @deprecated Prefer `VERTICAL_SCROLL_PANEL_CLASS` z `@/lib/uiScrollPanels`. */
export const INLINE_SCROLL_PANEL_CLASS = VERTICAL_SCROLL_PANEL_CLASS;

/** @deprecated Prefer `HORIZONTAL_SCROLL_PANEL_CLASS` z `@/lib/uiScrollPanels`. */
export const INLINE_SCROLL_X_PANEL_CLASS = HORIZONTAL_SCROLL_PANEL_CLASS;

/** Panel listy combobox renderowany przez portal nad resztą UI. */
export const FLOATING_LISTBOX_PANEL_CLASS = [
  "fixed z-[500] pointer-events-auto",
  VERTICAL_SCROLL_PANEL_CLASS,
  "rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900",
].join(" ");

export function touchScrollStyle(maxHeight?: number): CSSProperties {
  return maxHeight != null ? { maxHeight } : {};
}
