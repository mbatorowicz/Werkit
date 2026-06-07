import { UI_RADIUS_CARD } from "@/lib/uiRadius";
import { BORDER_DEFAULT } from "@/lib/uiTokens";

/** Wrapper tabeli admin / platform / magazyn. */
export const TABLE_WRAPPER = `overflow-x-auto ${UI_RADIUS_CARD} ${BORDER_DEFAULT}`;

/** Nagłówek tabeli. */
export const TABLE_HEAD = "bg-zinc-50 dark:bg-zinc-950/80";

/** Wiersz nagłówka. */
export const TABLE_HEAD_ROW = "text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400";

/** Komórka nagłówka. */
export const TABLE_TH = "px-4 py-3 text-left font-semibold whitespace-nowrap";

/** Komórka danych. */
export const TABLE_TD = "px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300";

/** Wiersz danych z separatorem. */
export const TABLE_BODY_ROW =
  "border-t border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50";

/** Pełna tabela. */
export const TABLE_BASE = "w-full text-left border-collapse";
