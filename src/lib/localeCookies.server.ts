import "server-only";

import { cookies } from "next/headers";
import type { Locale } from "@/i18n";
import { DEFAULT_UI_LOCALE, DEFAULT_UI_TIMEZONE } from "@/i18n/constants";
import { LOCALE_COOKIE, SUPPORTED_LOCALES, TIMEZONE_COOKIE } from "@/lib/localeCookies";

/**
 * Zwraca locale z cookies lub domyślne.
 * Tylko Server Components / route handlers.
 */
export async function getServerLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(LOCALE_COOKIE)?.value;
  if (raw && (SUPPORTED_LOCALES as readonly string[]).includes(raw)) {
    return raw as Locale;
  }
  return "pl";
}

/** Zwraca strefę czasową z cookies lub domyślną. */
export async function getServerTimezone(): Promise<string> {
  const cookieStore = await cookies();
  return cookieStore.get(TIMEZONE_COOKIE)?.value || DEFAULT_UI_TIMEZONE;
}

/** Locale + timezone do Intl.DateTimeFormat. */
export async function getServerLocaleConfig() {
  return {
    locale: await getServerLocale(),
    uiLocale: DEFAULT_UI_LOCALE,
    timezone: await getServerTimezone(),
  };
}
