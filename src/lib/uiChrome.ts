import { cn } from "@/lib/cn";
import { UI_RADIUS_CARD, UI_RADIUS_CONTROL } from "@/lib/uiRadius";
import {
  BORDER_DEFAULT,
  BORDER_DIVIDER,
  SURFACE_CARD,
  SURFACE_CHROME,
  TEXT_MUTED,
} from "@/lib/uiTokens";

/** Overlay modala / dialogu. */
export const OVERLAY_BACKDROP = "absolute inset-0 bg-black/60 backdrop-blur-sm";

export const OVERLAY_HOST = "fixed inset-0 flex items-center justify-center p-4";

export const MODAL_PANEL = cn(
  "relative z-10 flex w-full flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200",
  UI_RADIUS_CARD,
  BORDER_DEFAULT,
  SURFACE_CARD
);

export const MODAL_HEADER = cn(
  "flex shrink-0 items-center justify-between border-b px-6 py-4",
  BORDER_DIVIDER,
  SURFACE_CHROME
);

export const MODAL_FOOTER = cn(
  "shrink-0 border-t px-6 py-4",
  BORDER_DIVIDER,
  SURFACE_CHROME
);

export const MODAL_CLOSE_BTN = cn(
  "rounded-md p-1 transition",
  TEXT_MUTED,
  "hover:bg-zinc-200/80 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white"
);

export const MODAL_BODY_TEXT = cn("p-6 text-sm leading-relaxed", TEXT_MUTED);

export const SHELL_HEADER = cn(
  "sticky top-0 z-50 flex h-16 shrink-0 items-center justify-between border-b px-4",
  BORDER_DIVIDER,
  SURFACE_CARD
);

export const SHELL_FOOTER_NAV = cn(
  "sticky bottom-0 z-50 flex h-16 items-center justify-around border-t pb-safe",
  BORDER_DIVIDER,
  SURFACE_CARD
);

export const SHELL_SIDEBAR = cn(
  "z-50 hidden h-full min-h-0 w-64 flex-col border-r md:flex",
  BORDER_DIVIDER,
  SURFACE_CARD
);

export const NAV_ITEM =
  "flex h-full flex-1 flex-col items-center justify-center gap-1 text-zinc-600 transition-colors hover:text-emerald-500 dark:text-zinc-400";

export const NAV_ITEM_LABEL = "text-[10px] font-semibold uppercase tracking-wider";

export const LINK_ACCENT =
  "inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 transition hover:text-emerald-500 dark:text-emerald-400";

export const ICON_BTN_GHOST = cn(
  "rounded-lg p-2 transition",
  TEXT_MUTED,
  "hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white"
);

export const ICON_BTN_DANGER_GHOST =
  "rounded-lg p-2 text-zinc-500 transition hover:bg-red-50 hover:text-red-500 dark:text-zinc-400 dark:hover:bg-red-500/10";

export const CHIP_IDLE = cn(
  "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
  "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
);

export const CHIP_SELECTED =
  "rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300";

export const TAB_IDLE = cn(
  UI_RADIUS_CONTROL,
  "px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
);

export const TAB_ACTIVE = cn(
  UI_RADIUS_CONTROL,
  "bg-emerald-600 px-4 py-2 text-sm font-medium text-white dark:bg-emerald-500"
);

export const ALERT_WARNING =
  "rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300";

export const ALERT_DANGER =
  "rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300";

export const ALERT_SUCCESS =
  "rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300";

export const ALERT_MUTED = cn(
  "rounded-lg px-4 py-3 text-sm",
  BORDER_DEFAULT,
  SURFACE_CHROME,
  TEXT_MUTED
);

export const ACCENT_ICON_WRAP =
  "shrink-0 rounded-lg bg-emerald-100 p-2 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400";

export const VERSION_BADGE =
  "rounded border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 font-mono font-bold text-emerald-500";

export const USER_CHIP =
  "flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-100 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-800";

export const LOGOUT_ROW =
  "flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-zinc-500 transition-all hover:bg-red-50 hover:text-red-500 dark:text-zinc-400 dark:hover:bg-red-500/10";

export const TIMELINE_ICON_PHOTO =
  "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400";

export const TIMELINE_ICON_NOTE =
  "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400";

export const TIMELINE_SELECTED = "rounded-lg bg-emerald-50 p-2 -mx-2 dark:bg-emerald-500/10";
