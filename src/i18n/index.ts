import type { AppDictionary } from "./types";
import { pl } from "./locales/pl";
import { en } from "./locales/en";
import { de } from "./locales/de";

const dictionaries = {
  pl,
  en,
  de,
} as const;

export type Locale = keyof typeof dictionaries;

export type { AppDictionary };
export { formatDict, formatUiDateOnly, formatUiTimeHm, formatUiDateTimeShort } from "./format";
export { DEFAULT_UI_LOCALE, DEFAULT_UI_TIMEZONE } from "./constants";
export { useDictionary, useAppLocale, LocaleProvider } from "@/components/LocaleProvider";

/**
 * Zwraca słownik dla podanego locale.
 * Domyślnie PL; locale można pobrać z cookies przez getServerLocale().
 */
export function getDictionary(locale: Locale = "pl"): AppDictionary {
  return dictionaries[locale];
}
