"use client";

import { createContext, useContext, type ReactNode } from "react";
import { getDictionary, type AppDictionary, type Locale } from "@/i18n";

const LocaleContext = createContext<Locale>("pl");

export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

/** Locale z cookies (SSR prop lub client context). */
export function useAppLocale(): Locale {
  return useContext(LocaleContext);
}

/** Słownik dla bieżącego locale — używaj w Client Components zamiast getDictionary(). */
export function useDictionary(): AppDictionary {
  return getDictionary(useAppLocale());
}
