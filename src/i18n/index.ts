import type { AppDictionary } from "./types";
import { pl } from "./locales/pl";
import { en } from "./locales/en";

const dictionaries = {
  pl,
  en,
} as const;

export type Locale = keyof typeof dictionaries;

export type { AppDictionary };
export { formatDict } from "./format";
export { DEFAULT_UI_LOCALE } from "./constants";

/** Domyślnie PL; w przyszłości można pobierać locale z cookies lub nagłówka Accept-Language. */
export function getDictionary(locale: Locale = "pl"): AppDictionary {
  return dictionaries[locale];
}

