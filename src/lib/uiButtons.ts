import { UI_RADIUS_CONTROL } from "@/lib/uiRadius";

const BTN_BASE =
  "inline-flex items-center justify-center gap-2 text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed";

/** Primary action — emerald (kanoniczny akcent Werkit). */
export const BTN_PRIMARY = `${BTN_BASE} ${UI_RADIUS_CONTROL} bg-emerald-600 text-white hover:bg-emerald-500 px-6 py-2.5 min-w-[7rem]`;

/** Primary full-width (mobile modals). */
export const BTN_PRIMARY_FULL = `${BTN_PRIMARY} w-full sm:w-auto`;

/** Primary compact — nagłówki list, „Dodaj…”. */
export const BTN_PRIMARY_COMPACT = `${BTN_BASE} ${UI_RADIUS_CONTROL} bg-emerald-600 text-white hover:bg-emerald-500 px-5 py-2.5 shadow-sm`;

/** Primary compact (mniejszy padding). */
export const BTN_PRIMARY_COMPACT_SM = `${BTN_BASE} ${UI_RADIUS_CONTROL} bg-emerald-600 text-white hover:bg-emerald-500 px-4 py-2 shadow-sm`;

/** Secondary / cancel. */
export const BTN_SECONDARY = `${BTN_BASE} ${UI_RADIUS_CONTROL} border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 px-5 py-2.5`;

/** Secondary full-width (mobile modals). */
export const BTN_SECONDARY_FULL = `${BTN_SECONDARY} w-full sm:w-auto`;

/** Secondary compact. */
export const BTN_SECONDARY_SM = `${BTN_BASE} ${UI_RADIUS_CONTROL} border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 px-3 py-1.5 text-xs`;

/** Destructive confirm. */
export const BTN_DANGER = `${BTN_BASE} ${UI_RADIUS_CONTROL} bg-red-600 text-white hover:bg-red-500 px-6 py-2.5 min-w-[7rem]`;

/** Destructive full-width (mobile modals). */
export const BTN_DANGER_FULL = `${BTN_DANGER} w-full sm:w-auto`;

/** Destructive outlined (usuń zlecenie, zwróć część). */
export const BTN_DANGER_SOFT = `${BTN_BASE} ${UI_RADIUS_CONTROL} border border-red-200 bg-red-500/10 px-4 py-2.5 text-red-700 hover:bg-red-500/15 dark:border-red-500/30 dark:text-red-400`;

export const BTN_SOFT_PRIMARY = `${BTN_BASE} w-full ${UI_RADIUS_CONTROL} border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-medium px-4 py-3.5`;
export const BTN_LOGIN_SUBMIT = `${BTN_BASE} w-full ${UI_RADIUS_CONTROL} bg-emerald-600 text-white hover:bg-emerald-500 font-medium px-4 py-3.5`;

/** Worker wizard — duży CTA. */
export const BTN_PRIMARY_LG = `${BTN_BASE} ${UI_RADIUS_CONTROL} bg-emerald-600 text-white hover:bg-emerald-500 px-6 py-3 font-bold`;

/** Worker — pełnoszerokościowy CTA (akceptacja / zapis). */
export const BTN_CTA_XL = `${BTN_BASE} w-full ${UI_RADIUS_CONTROL} bg-emerald-600 text-white hover:bg-emerald-500 py-5 px-6 font-bold text-lg active:scale-95 shadow-[0_0_40px_-10px_rgba(16,185,129,0.5)]`;

/** Worker — zakończenie sesji. */
export const BTN_CTA_DANGER_XL = `${BTN_BASE} w-full ${UI_RADIUS_CONTROL} bg-red-600 text-white hover:bg-red-500 py-4 flex-col gap-1 active:scale-95 shadow-[0_0_30px_-10px_rgba(220,38,38,0.4)]`;

/** Ghost / ikona w nagłówku. */
export const BTN_GHOST = `${BTN_BASE} ${UI_RADIUS_CONTROL} px-3 py-2 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800`;

/** Pill na mapie (nawigacja / geolokalizacja). */
export const BTN_MAP_PILL = `${BTN_BASE} rounded-full bg-emerald-600 px-4 py-2 text-xs font-medium text-white shadow-lg border border-emerald-500 hover:bg-emerald-500 active:scale-95`;

export const BTN_MAP_PILL_DANGER = `${BTN_BASE} rounded-full bg-red-600 px-4 py-2 text-xs font-medium text-white shadow-lg border border-red-500 hover:bg-red-500 active:scale-95`;
