import { cookies } from "next/headers";
import type { Locale } from "@/i18n";
import { DEFAULT_UI_LOCALE, DEFAULT_UI_TIMEZONE } from "@/i18n/constants";

export const LOCALE_COOKIE = "werkit_locale";
export const TIMEZONE_COOKIE = "werkit_timezone";

export const SUPPORTED_LOCALES: Locale[] = ["pl", "en"];

/**
 * Zwraca locale z cookies lub domyślne.
 * Używane w Server Components / layoutach.
 * W Next.js 16 cookies() zwraca Promise.
 */
export async function getServerLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(LOCALE_COOKIE)?.value;
  if (raw && (SUPPORTED_LOCALES as readonly string[]).includes(raw)) {
    return raw as Locale;
  }
  return "pl";
}

/**
 * Zwraca strefę czasową z cookies lub domyślną.
 */
export async function getServerTimezone(): Promise<string> {
  const cookieStore = await cookies();
  return cookieStore.get(TIMEZONE_COOKIE)?.value || DEFAULT_UI_TIMEZONE;
}

/**
 * Zwraca locale + timezone do użycia w Intl.DateTimeFormat.
 */
export async function getServerLocaleConfig() {
  return {
    locale: await getServerLocale(),
    uiLocale: DEFAULT_UI_LOCALE,
    timezone: await getServerTimezone(),
  };
}
