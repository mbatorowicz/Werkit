import type { Locale } from "@/i18n";

/** Nazwy cookies locale/timezone — bezpieczne dla Client Components. */
export const LOCALE_COOKIE = "werkit_locale";
export const TIMEZONE_COOKIE = "werkit_timezone";

export const SUPPORTED_LOCALES: Locale[] = ["pl", "en", "de"];
