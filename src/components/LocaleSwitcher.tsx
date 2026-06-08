"use client";

import { Languages } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/i18n";
import { useLocale } from "@/hooks/useLocale";
import { useDictionary } from "@/components/LocaleProvider";
import { cn } from "@/lib/cn";
import { ThemeToggle } from "@/components/ThemeToggle";

type LocaleSwitcherVariant = "header" | "embedded" | "profile";

function LocaleButtonGroup({
  locale,
  onChange,
  ariaLabel,
  supportedLocales,
}: {
  locale: Locale;
  onChange: (next: Locale) => void;
  ariaLabel: string;
  supportedLocales: { value: Locale; label: string }[];
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex items-center rounded-md border border-zinc-200/70 bg-zinc-50/80 p-0.5 dark:border-zinc-700/70 dark:bg-zinc-900/50"
    >
      {supportedLocales.map((l) => {
        const active = locale === l.value;
        return (
          <button
            key={l.value}
            type="button"
            onClick={() => onChange(l.value)}
            aria-pressed={active}
            aria-current={active ? "true" : undefined}
            className={cn(
              "min-w-[1.75rem] rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-none tracking-wide transition-colors",
              active
                ? "bg-white text-emerald-700 shadow-sm dark:bg-zinc-800 dark:text-emerald-400"
                : "text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
            )}
          >
            {l.value}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Przełącznik języka — trzy dyskretne przyciski PL / EN / DE.
 * Zapisuje wybór do cookies (werkit_locale) i odświeża SSR z nowym locale.
 */
export function LocaleSwitcher({ variant = "header" }: { variant?: LocaleSwitcherVariant }) {
  const router = useRouter();
  const { locale, setLocale, supportedLocales } = useLocale();
  const dict = useDictionary();

  const onChange = (next: Locale) => {
    if (next === locale) return;
    setLocale(next);
    router.refresh();
  };

  const buttons = (
    <LocaleButtonGroup
      locale={locale}
      onChange={onChange}
      ariaLabel={dict.localeSwitcher.label}
      supportedLocales={supportedLocales}
    />
  );

  if (variant === "profile") {
    return (
      <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex min-w-0 items-center gap-3">
          <div className="shrink-0 rounded-lg bg-emerald-100 p-2 dark:bg-emerald-500/20">
            <Languages className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-zinc-900 dark:text-white">{dict.localeSwitcher.title}</p>
            <p className="text-xs text-zinc-500">{dict.localeSwitcher.description}</p>
          </div>
        </div>
        <div className="shrink-0">{buttons}</div>
      </div>
    );
  }

  if (variant === "embedded") {
    return (
      <div className="flex items-center justify-end gap-0.5 border-t border-zinc-200/80 pt-2 dark:border-zinc-700/80">
        {buttons}
        <ThemeToggle />
      </div>
    );
  }

  return buttons;
}
