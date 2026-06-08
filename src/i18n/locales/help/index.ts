import { helpPl } from "./pl";

export type HelpLocaleBundle = typeof helpPl;

/** Locale z treścią pomocy — bez importu z @/i18n (unikamy cyklu pl → help → i18n → pl). */
export type HelpLocale = "pl" | "en" | "de";

/**
 * Treść instrukcji obsługi per locale.
 * EN/DE tymczasowo używają PL — docelowo osobne pliki en.ts / de.ts w tym katalogu.
 */
const bundles: Record<HelpLocale, HelpLocaleBundle> = {
  pl: helpPl,
  en: helpPl,
  de: helpPl,
};

export function getHelpBundle(locale: HelpLocale): HelpLocaleBundle {
  return bundles[locale];
}
