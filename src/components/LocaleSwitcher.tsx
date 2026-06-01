"use client";

import { useLocale } from "@/hooks/useLocale";
import { getDictionary } from "@/i18n";

/**
 * Przełącznik języka i strefy czasowej.
 * Używany w shellu admina / workera.
 * Zapisuje wybór do cookies (werkit_locale, werkit_timezone).
 */
export function LocaleSwitcher() {
  const { locale, localeLabel, setLocale, supportedLocales } = useLocale();
  const localeSwitcherLabel = getDictionary(locale).localeSwitcher.label;

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground hidden sm:inline">{localeLabel}</span>
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as typeof locale)}
        className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-600 dark:bg-zinc-800"
        aria-label={localeSwitcherLabel}
      >
        {supportedLocales.map((l) => (
          <option key={l.value} value={l.value}>
            {l.label}
          </option>
        ))}
      </select>
    </div>
  );
}
