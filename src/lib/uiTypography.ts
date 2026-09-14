/** Skala typografii Werkit — SSOT nagłówków i etykiet. */

/** Tytuł strony (admin, worker, platform). */
export const PAGE_TITLE = "text-xl font-semibold tracking-tight text-zinc-900 dark:text-white";

/** Podtytuł strony (opcjonalny, krótki). */
export const PAGE_SUBTITLE = "text-sm text-zinc-500 dark:text-zinc-400";

/** Tytuł sekcji formularza / panelu. */
export const SECTION_TITLE = "text-base font-semibold text-zinc-900 dark:text-white";

/** Etykieta pola formularza. */
export const FIELD_LABEL = "block text-sm font-medium text-zinc-700 dark:text-zinc-300";

/** Etykieta wymagana (gwiazdka). */
export const FIELD_LABEL_REQUIRED = `${FIELD_LABEL} after:ml-0.5 after:text-red-500 after:content-['*']`;

/** Zwarta etykieta w gęstych modalach (zlecenie, DUR). */
export const FIELD_LABEL_COMPACT =
  "block text-xs font-semibold tracking-wide text-zinc-500 dark:text-zinc-400";

export const FIELD_HINT = "text-[11px] text-zinc-500 dark:text-zinc-400";

export const FIELD_STACK = "space-y-1.5";

export const FIELD_MUTED = "text-xs italic text-zinc-500 dark:text-zinc-400";

/** Tytuł modala — spójny z AdminModalShell. */
export const MODAL_TITLE = "text-lg font-semibold text-zinc-900 dark:text-white";

export const MODAL_TITLE_SM = "text-base font-semibold text-zinc-900 dark:text-white";

export const BRAND_WORDMARK =
  "text-lg font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-600";

export const BRAND_WORDMARK_LG =
  "text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-600";
