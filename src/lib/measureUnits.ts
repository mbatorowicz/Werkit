/** Dozwolone jednostki magazynowe (materiały + części DUR). */
export const MEASURE_UNITS = [
  "szt.",
  "op.",
  "kg",
  "t",
  "g",
  "l",
  "m",
  "m²",
  "m³",
  "mb",
  "kpl.",
] as const;

export type MeasureUnit = (typeof MEASURE_UNITS)[number];

const MEASURE_UNIT_SET = new Set<string>(MEASURE_UNITS);

export const DEFAULT_MATERIAL_MEASURE_UNIT: MeasureUnit = "t";
export const DEFAULT_SPARE_PART_MEASURE_UNIT: MeasureUnit = "szt.";

/** Normalizuje wpis z formularza / API; null gdy pusta lub niedozwolona. */
export function normalizeMeasureUnit(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 50) return null;
  if (!MEASURE_UNIT_SET.has(trimmed)) return null;
  return trimmed;
}

/** Zwraca dozwoloną jednostkę lub wartość domyślną. */
export function resolveMeasureUnit(raw: unknown, fallback: MeasureUnit): MeasureUnit {
  const normalized = normalizeMeasureUnit(raw);
  return (normalized as MeasureUnit | null) ?? fallback;
}

/** Lista opcji selecta — dołącza wartość spoza kanonu (np. legacy w DB). */
export function measureUnitSelectValues(current?: string | null): string[] {
  const cur = typeof current === "string" ? current.trim() : "";
  if (cur && !MEASURE_UNIT_SET.has(cur)) {
    return [cur, ...MEASURE_UNITS];
  }
  return [...MEASURE_UNITS];
}
