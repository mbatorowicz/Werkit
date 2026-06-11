import { UI_RADIUS_CARD } from "@/lib/uiRadius";
import { HORIZONTAL_SCROLL_PANEL_CLASS } from "@/lib/uiScrollPanels";
import { BORDER_DEFAULT } from "@/lib/uiTokens";

/** Karta tabeli admin (obudowa list / magazyn). */
export const TABLE_CARD = `flex flex-col overflow-hidden ${UI_RADIUS_CARD} border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900`;

/** Wrapper tabeli — poziomy scroll + obramowanie (np. platform). */
export const TABLE_WRAPPER = `${HORIZONTAL_SCROLL_PANEL_CLASS} ${UI_RADIUS_CARD} ${BORDER_DEFAULT}`;

/** Pełna tabela. */
export const TABLE_BASE = "w-full min-w-0 border-collapse text-left text-sm";

/** Nagłówek kolumn. */
export const TABLE_HEAD =
  "border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700/50 dark:bg-zinc-950/80";

/** Wiersz nagłówka — etykiety kolumn. */
export const TABLE_HEAD_ROW =
  "text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400";

/** Komórka nagłówka. */
export const TABLE_TH = "px-4 py-3 text-left font-semibold whitespace-nowrap";

/** Komórka nagłówka wyrównana do prawej. */
export const TABLE_TH_RIGHT = `${TABLE_TH} text-right`;

/** Komórka danych. */
export const TABLE_TD = "px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300";

/** Komórka danych — wyrównanie do prawej (stan, liczby). */
export const TABLE_TD_RIGHT = `${TABLE_TD} text-right`;

/** Komórka danych — stonowany tekst (data, uwagi). */
export const TABLE_TD_MUTED = `${TABLE_TD} text-zinc-500 dark:text-zinc-400`;

/** Komórka danych — wartość wyróżniona (nazwa wiersza). */
export const TABLE_TD_STRONG = `${TABLE_TD} font-medium text-zinc-900 dark:text-zinc-100`;

/** Wiersz danych z separatorem i hover. */
export const TABLE_BODY_ROW =
  "border-t border-zinc-100 transition-colors hover:bg-zinc-50/80 dark:border-zinc-800 dark:hover:bg-zinc-800/20";

/** Wiersz klikalny (podgląd / edycja). */
export const TABLE_ROW_CLICKABLE = `cursor-pointer ${TABLE_BODY_ROW}`;

/** Komórka ładowania / pustego stanu. */
export const TABLE_EMPTY_CELL = `${TABLE_TD} py-12 text-center text-zinc-500 dark:text-zinc-400`;

/** Główna etykieta wiersza (nazwa materiału, klienta…). */
export const TABLE_CELL_NAME = "font-semibold text-zinc-900 dark:text-zinc-200";

/** Podtytuł wiersza (np. ID). */
export const TABLE_CELL_SUBTITLE =
  "mt-0.5 text-[11px] uppercase tracking-widest text-zinc-500 dark:text-zinc-400";

/** Kontener przycisków akcji w wierszu. */
export const TABLE_ACTIONS = "flex items-center justify-end gap-1";

/** Link tekstowy akcji (np. korekta stanu). */
export const TABLE_ACTION_LINK =
  "rounded-lg px-2 py-1 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-500/10 dark:text-emerald-400";

/** Ikona akcji — baza. */
export const TABLE_ACTION_ICON =
  "rounded-lg p-2 text-zinc-500 transition-colors dark:text-zinc-400";

/** Ikona edycji. */
export const TABLE_ACTION_ICON_EDIT = `${TABLE_ACTION_ICON} hover:bg-amber-500/10 hover:text-amber-500`;

/** Ikona usuwania. */
export const TABLE_ACTION_ICON_DELETE = `${TABLE_ACTION_ICON} hover:bg-red-500/10 hover:text-red-500`;

/** Badge niskiego stanu magazynowego. */
export const TABLE_LOW_STOCK_BADGE =
  "inline-flex items-center gap-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 dark:bg-amber-500/10 dark:text-amber-400";
