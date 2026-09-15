import { cn } from "@/lib/cn";
import { CUSTOM_SCROLLBAR_CLASS } from "@/lib/uiScrollPanels";

export type GanttDensity = "inline" | "touch";

export const GANTT_LABEL_COL: Record<GanttDensity, string> = {
  inline: "w-40 md:w-48",
  touch: "w-28",
};

export const GANTT_GRID_OFFSET: Record<GanttDensity, string> = {
  inline: "left-40 md:left-48",
  touch: "left-28",
};

export const GANTT_ROW_TRACK: Record<GanttDensity, string> = {
  inline: "h-10 my-1",
  touch: "h-14 my-0.5",
};

export const GANTT_BAR_TEXT: Record<GanttDensity, string> = {
  inline: "text-[10px]",
  touch: "text-xs",
};

/** Scroll osi X+Y w pełnym ekranie (pionowe wiersze + pozioma oś). */
export const GANTT_TOUCH_SCROLL_CLASS = cn(
  "overflow-auto overscroll-contain",
  CUSTOM_SCROLLBAR_CLASS
);
