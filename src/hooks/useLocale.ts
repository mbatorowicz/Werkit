"use client";

import { useCallback, useState } from "react";
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

/** Odczytuje locale z cookies (SSOT — jedna funkcja). */
function readLocaleFromCookie(): Locale {
  const raw = getCookie(LOCALE_COOKIE) || "pl";
  return (SUPPORTED_LOCALES as readonly string[]).includes(raw) ? (raw as Locale) : "pl";
}

/** Odczytuje timezone z cookies lub z Intl API. */
function readTimezoneFromCookie(): string {
  return getCookie(TIMEZONE_COOKIE) || Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Warsaw";
}

/** Buduje pełny LocaleConfig z cookies. */
function buildLocaleConfigFromCookies(): LocaleConfig {
  const locale = readLocaleFromCookie();
  return {
    locale,
    localeLabel: LOCALE_MAP[locale],
    timezone: readTimezoneFromCookie(),
  };
}

/**
 * Hook do odczytu i zmiany locale + timezone z cookies.
 * Używany w Client Components.
 * Stan inicjalizowany leniwie z cookies — brak duplikacji logiki w useEffect.
 */
export function useLocale(): LocaleConfig & {
  setLocale: (locale: Locale) => void;
  setTimezone: (tz: string) => void;
  supportedLocales: { value: Locale; label: string }[];
} {
  const [config, setConfig] = useState<LocaleConfig>(buildLocaleConfigFromCookies);

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

  return {
    ...config,
    setLocale,
    setTimezone,
    supportedLocales: SUPPORTED_LOCALES.map((l) => ({ value: l, label: LOCALE_MAP[l] })),
  };
}
