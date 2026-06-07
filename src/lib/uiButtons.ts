import { UI_RADIUS_CONTROL } from "@/lib/uiRadius";

const BTN_BASE =
  "inline-flex items-center justify-center text-sm font-semibold transition disabled:opacity-50";

/** Primary action — emerald (kanoniczny akcent Werkit). */
export const BTN_PRIMARY = `${BTN_BASE} ${UI_RADIUS_CONTROL} bg-emerald-600 text-white hover:bg-emerald-500 px-6 py-2.5 min-w-[7rem]`;

/** Primary full-width (mobile modals). */
export const BTN_PRIMARY_FULL = `${BTN_PRIMARY} w-full sm:w-auto`;

/** Secondary / cancel. */
export const BTN_SECONDARY = `${BTN_BASE} ${UI_RADIUS_CONTROL} border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 px-5 py-2.5`;

/** Secondary full-width (mobile modals). */
export const BTN_SECONDARY_FULL = `${BTN_SECONDARY} w-full sm:w-auto`;

/** Destructive confirm. */
export const BTN_DANGER = `${BTN_BASE} ${UI_RADIUS_CONTROL} bg-red-600 text-white hover:bg-red-500 px-6 py-2.5 min-w-[7rem]`;

/** Login submit — neutral inverted. */
export const BTN_LOGIN_SUBMIT = `${BTN_BASE} w-full ${UI_RADIUS_CONTROL} bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-900 font-medium px-4 py-3.5`;
