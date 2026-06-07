"use client";

import { useRouter } from "next/navigation";
import { useLocale } from "@/hooks/useLocale";
import { useDictionary } from "@/components/LocaleProvider";
import { INPUT_BASE } from "@/lib/uiTokens";

/**
 * Przełącznik języka.
 * Zapisuje wybór do cookies (werkit_locale) i odświeża SSR z nowym locale.
 */
export function LocaleSwitcher() {
  const router = useRouter();
  const { locale, localeLabel, setLocale, supportedLocales } = useLocale();
  const dict = useDictionary();

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-zinc-500 dark:text-zinc-400 hidden sm:inline">{localeLabel}</span>
      <select
        value={locale}
        onChange={(e) => {
          setLocale(e.target.value as typeof locale);
          router.refresh();
        }}
        className={`${INPUT_BASE} w-auto min-h-0 py-1.5 px-2 text-xs`}
        aria-label={dict.localeSwitcher.label}
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
