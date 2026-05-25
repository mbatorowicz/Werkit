"use client";

import { useCallback, useEffect, useState } from "react";
import type { Locale } from "@/i18n";
import { LOCALE_COOKIE, TIMEZONE_COOKIE, SUPPORTED_LOCALES } from "@/lib/localeCookies";

const LOCALE_MAP: Record<Locale, string> = {
  pl: "Polski",
  en: "English",
  de: "Deutsch",
};

function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

function setCookie(name: string, value: string, days = 365): void {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

export interface LocaleConfig {
  locale: Locale;
  localeLabel: string;
  timezone: string;
}

/**
 * Hook do odczytu i zmiany locale + timezone z cookies.
 * Używany w Client Components.
 */
export function useLocale(): LocaleConfig & {
  setLocale: (locale: Locale) => void;
  setTimezone: (tz: string) => void;
  supportedLocales: { value: Locale; label: string }[];
} {
  const [config, setConfig] = useState<LocaleConfig>(() => {
    const localeRaw = getCookie(LOCALE_COOKIE) || "pl";
    const locale = (SUPPORTED_LOCALES as readonly string[]).includes(localeRaw)
      ? (localeRaw as Locale)
      : "pl";
    return {
      locale,
      localeLabel: LOCALE_MAP[locale],
      timezone: getCookie(TIMEZONE_COOKIE) || Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Warsaw",
    };
  });

  const setLocale = useCallback((locale: Locale) => {
    setCookie(LOCALE_COOKIE, locale);
    setConfig((prev) => ({
      ...prev,
      locale,
      localeLabel: LOCALE_MAP[locale],
    }));
  }, []);

  const setTimezone = useCallback((tz: string) => {
    setCookie(TIMEZONE_COOKIE, tz);
    setConfig((prev) => ({ ...prev, timezone: tz }));
  }, []);

  // Sync przy mount — odczytuje aktualne cookies (np. zmienione w innej karcie)
  useEffect(() => {
    const localeRaw = getCookie(LOCALE_COOKIE) || "pl";
    const locale = (SUPPORTED_LOCALES as readonly string[]).includes(localeRaw)
      ? (localeRaw as Locale)
      : "pl";
    setConfig({
      locale,
      localeLabel: LOCALE_MAP[locale],
      timezone: getCookie(TIMEZONE_COOKIE) || Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Warsaw",
    });
  }, []);

  return {
    ...config,
    setLocale,
    setTimezone,
    supportedLocales: SUPPORTED_LOCALES.map((l) => ({ value: l, label: LOCALE_MAP[l] })),
  };
}
