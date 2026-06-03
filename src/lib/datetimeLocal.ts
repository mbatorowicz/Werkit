/** Krok wyboru czasu w polach `datetime-local` (minuty). */
export const DATETIME_LOCAL_STEP_MINUTES = 10;

/** Krok w sekundach dla atrybutu HTML `step`. */
export const DATETIME_LOCAL_STEP_SECONDS = DATETIME_LOCAL_STEP_MINUTES * 60;

const pad2 = (n: number) => String(n).padStart(2, "0");

/**
 * Zaokrągla część godzinową wartości `datetime-local` (YYYY-MM-DDTHH:mm) do najbliższych 10 minut.
 * Pusta lub niepełna wartość — bez zmian.
 */
export function roundDatetimeLocalToStep(value: string): string {
  const trimmed = value.trim();
  if (!trimmed.includes("T")) return trimmed;

  const [datePart, timePart] = trimmed.split("T");
  if (!datePart || !timePart) return trimmed;

  const [hRaw, mRaw] = timePart.split(":");
  const h = Number.parseInt(hRaw ?? "", 10);
  const m = Number.parseInt(mRaw ?? "", 10);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return trimmed;

  const totalMinutes = h * 60 + m;
  const rounded =
    Math.round(totalMinutes / DATETIME_LOCAL_STEP_MINUTES) * DATETIME_LOCAL_STEP_MINUTES;
  const hours = Math.floor(rounded / 60) % 24;
  const minutes = rounded % 60;

  return `${datePart}T${pad2(hours)}:${pad2(minutes)}`;
}
