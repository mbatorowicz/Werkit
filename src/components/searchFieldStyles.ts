import { INPUT_BASE } from "@/lib/uiTokens";

/** Wspólne klasy pól wyszukiwania (listy admin/worker + combobox). */
export const SEARCH_FIELD_INPUT_CLASS = INPUT_BASE;

export const SEARCH_COMBOBOX_INPUT_CLASS = `${SEARCH_FIELD_INPUT_CLASS} pl-4 pr-10 py-2.5`;

export const LIST_SEARCH_INPUT_CLASS = `${SEARCH_FIELD_INPUT_CLASS} py-2.5 pl-10 pr-4`;

/** Etykiety zwrotne combobox — wspólne dla admin i worker wizard. */
export function comboboxFeedbackProps(dict: { searchNoResults: string; searchClear: string }) {
  return {
    noResultsLabel: dict.searchNoResults,
    clearAriaLabel: dict.searchClear,
  };
}
