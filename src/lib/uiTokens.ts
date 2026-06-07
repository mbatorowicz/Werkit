import { cn } from "@/lib/cn";

/**
 * Tokeny wizualne Werkit — SSOT kolorów, powierzchni i focus.
 * Paleta: zinc (neutral) + emerald (akcent) + mint (#f2fbfa) jako tło aplikacji.
 */

export const SURFACE_MINT = "bg-[#f2fbfa] dark:bg-zinc-900";
export const SURFACE_MINT_INPUT = "bg-[#f2fbfa] dark:bg-zinc-900";
export const SURFACE_CARD = "bg-white dark:bg-zinc-900";
export const SURFACE_MUTED = "bg-zinc-100 dark:bg-zinc-800";

export const BORDER_DEFAULT = "border border-zinc-200 dark:border-zinc-700";
export const BORDER_SUBTLE = "border border-zinc-200 dark:border-zinc-800";

export const FOCUS_EMERALD =
  "outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500";

export const TEXT_PRIMARY = "text-zinc-900 dark:text-white";
export const TEXT_SECONDARY = "text-zinc-600 dark:text-zinc-400";
export const TEXT_MUTED = "text-zinc-500 dark:text-zinc-400";

/** Min. wysokość pól formularzy (admin + worker). */
export const CONTROL_MIN_H = "min-h-[2.75rem]";

/** Standardowy padding pól tekstowych. */
export const CONTROL_PADDING = "px-4 py-2.5";

/** Pełna klasa bazowa pola tekstowego (mint + emerald focus). */
export const INPUT_BASE = cn(
  "w-full rounded-lg text-sm",
  CONTROL_MIN_H,
  CONTROL_PADDING,
  BORDER_DEFAULT,
  SURFACE_MINT_INPUT,
  TEXT_PRIMARY,
  FOCUS_EMERALD
);
