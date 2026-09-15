import { cn } from "@/lib/cn";
import { UI_RADIUS_CARD, UI_RADIUS_CONTROL } from "@/lib/uiRadius";

/**
 * Tokeny wizualne Werkit — SSOT kolorów, powierzchni, focus i kontrolek.
 * Paleta: zinc (neutral) + emerald (akcent) + mint (#f2fbfa) jako tło aplikacji.
 */

export const SURFACE_MINT = "bg-[#f2fbfa] dark:bg-zinc-900";
export const SURFACE_MINT_INPUT = "bg-[#f2fbfa] dark:bg-zinc-900";
export const SURFACE_CARD = "bg-white dark:bg-zinc-900";
export const SURFACE_MUTED = "bg-zinc-100 dark:bg-zinc-800";
export const SURFACE_CHROME = "bg-zinc-50 dark:bg-zinc-950/80";

export const BORDER_DEFAULT = "border border-zinc-200 dark:border-zinc-700";
export const BORDER_SUBTLE = "border border-zinc-200 dark:border-zinc-800";
export const BORDER_DIVIDER = "border-zinc-200 dark:border-zinc-700";

export const FOCUS_EMERALD =
  "outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500";
export const FOCUS_DANGER =
  "outline-none transition focus:border-red-500 focus:ring-1 focus:ring-red-500";

export const TEXT_PRIMARY = "text-zinc-900 dark:text-white";
export const TEXT_SECONDARY = "text-zinc-600 dark:text-zinc-400";
export const TEXT_MUTED = "text-zinc-500 dark:text-zinc-400";
export const TEXT_ACCENT = "text-emerald-600 dark:text-emerald-400";

/** Tło całej aplikacji (admin + worker). */
export const SURFACE_APP = cn(SURFACE_MINT, TEXT_PRIMARY, "dark:text-zinc-100");

/** Padding stron admina — ciaśniejszy na telefonie. */
export const PAGE_PAD = "p-4 md:p-8";

/** Min. cel dotykowy 44px (ikony nagłówka, zamknięcie modala). */
export const ICON_HIT = "inline-flex items-center justify-center min-h-11 min-w-11";

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

export const INPUT_DANGER = cn(INPUT_BASE, FOCUS_DANGER);

export const SELECT_BASE = cn(INPUT_BASE, "appearance-none");

export const TEXTAREA_BASE = cn(INPUT_BASE, "min-h-[6rem] resize-y py-3");

/** Wiersz przełącznika / checkboxa w ustawieniach. */
export const CONTROL_ROW = cn(
  "flex cursor-pointer items-center gap-3 p-3",
  UI_RADIUS_CONTROL,
  BORDER_DEFAULT,
  SURFACE_MINT_INPUT
);

/** Karta powierzchni (listy, panele, profile). */
export const CARD = cn(UI_RADIUS_CARD, BORDER_DEFAULT, SURFACE_CARD, "shadow-sm");

export const CARD_PADDED = cn(CARD, "p-4");

/** Zagnieżdżona sekcja w formularzu (mapa, lokalizacje, zdjęcie). */
export const CARD_NESTED = cn(
  "space-y-3 p-4",
  UI_RADIUS_CONTROL,
  BORDER_DEFAULT,
  "bg-zinc-50/80 dark:bg-zinc-950/40"
);

export const PLACEHOLDER_BLOCK = cn(
  "flex w-full items-center justify-center",
  UI_RADIUS_CONTROL,
  SURFACE_MUTED,
  TEXT_MUTED,
  "text-sm"
);
