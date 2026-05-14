import { DEFAULT_UI_LOCALE, DEFAULT_UI_TIMEZONE } from "./constants";

/**
 * Zamienia placeholdery `{klucz}` w łańcuchach ze słownika (np. orderFastReq, geofenceConfirm).
 */
export function formatDict(template: string, vars: Record<string, string | number>): string {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    out = out.split(`{${key}}`).join(String(value));
  }
  return out;
}

function asDate(value: string | Date | number): Date {
  if (value instanceof Date) return value;
  if (typeof value === "number") return new Date(value);
  return new Date(value);
}

/** Data kalendarzowa w stałej strefie UI (spójny SSR + klient). */
export function formatUiDateOnly(value: string | Date | number): string {
  return asDate(value).toLocaleDateString(DEFAULT_UI_LOCALE, { timeZone: DEFAULT_UI_TIMEZONE });
}

/** Godzina HH:mm w stałej strefie UI. */
export function formatUiTimeHm(value: string | Date | number): string {
  return asDate(value).toLocaleTimeString(DEFAULT_UI_LOCALE, {
    timeZone: DEFAULT_UI_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Data + godzina (krótko) w stałej strefie UI — zamiast `toLocaleString` bez `timeZone` (SSR vs klient). */
export function formatUiDateTimeShort(value: string | Date | number): string {
  return asDate(value).toLocaleString(DEFAULT_UI_LOCALE, {
    timeZone: DEFAULT_UI_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
