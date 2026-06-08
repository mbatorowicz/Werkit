"use client";

import { Languages } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/hooks/useLocale";
import { useDictionary } from "@/components/LocaleProvider";
import { INPUT_BASE } from "@/lib/uiTokens";

type LocaleSwitcherVariant = "header" | "embedded" | "profile";

/**
 * Przełącznik języka.
 * Zapisuje wybór do cookies (werkit_locale) i odświeża SSR z nowym locale.
 */
export function LocaleSwitcher({ variant = "header" }: { variant?: LocaleSwitcherVariant }) {
  const router = useRouter();
  const { locale, localeLabel, setLocale, supportedLocales } = useLocale();
  const dict = useDictionary();

  const onChange = (next: typeof locale) => {
    setLocale(next);
    router.refresh();
  };

  const selectClass =
    variant === "embedded"
      ? `${INPUT_BASE} w-auto min-h-0 flex-1 max-w-[9rem] py-1 px-2 text-xs`
      : `${INPUT_BASE} w-auto min-h-0 py-1.5 px-2 text-xs`;

  const select = (
    <select
      value={locale}
      onChange={(e) => onChange(e.target.value as typeof locale)}
      className={selectClass}
      aria-label={dict.localeSwitcher.label}
    >
      {supportedLocales.map((l) => (
        <option key={l.value} value={l.value}>
          {l.label}
        </option>
      ))}
    </select>
  );

  if (variant === "profile") {
    return (
      <div className="mt-4 flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-emerald-100 p-2 dark:bg-emerald-500/20">
            <Languages className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="font-medium text-zinc-900 dark:text-white">{dict.localeSwitcher.title}</p>
            <p className="text-xs text-zinc-500">{dict.localeSwitcher.description}</p>
          </div>
        </div>
        {select}
      </div>
    );
  }

  if (variant === "embedded") {
    return (
      <div className="flex items-center justify-between gap-2 border-t border-zinc-200/80 pt-2 dark:border-zinc-700/80">
        <span className="text-xs text-zinc-500 dark:text-zinc-400">{dict.localeSwitcher.title}</span>
        {select}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="hidden text-zinc-500 dark:text-zinc-400 sm:inline">{localeLabel}</span>
      {select}
    </div>
  );
}
