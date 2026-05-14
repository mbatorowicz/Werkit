/** Locale formatowania dat/czasu do czasu podłączenia wyboru języka z cookies lub profilu. */
export const DEFAULT_UI_LOCALE = "pl-PL";

/**
 * Strefa dla `Intl` przy SSR + hydracji (Vercel = UTC, klient = lokalna — bez tego same ISO daje różne stringi i React #418).
 * Dopóki nie ma profilu TZ użytkownika, flota PL → Warszawa.
 */
export const DEFAULT_UI_TIMEZONE = "Europe/Warsaw";
