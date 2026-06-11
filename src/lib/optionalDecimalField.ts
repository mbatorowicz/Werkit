import { normalizeDecimalBodyField } from "@/lib/decimalInput";

export type OptionalDecimalResult<T> = { ok: true; value: string | T } | { ok: false };

/**
 * Puste wartości (null/undefined/"") mapuje na `emptyValue`;
 * niepoprawne liczby zgłasza jako `ok: false`.
 */
export function normalizeOptionalDecimalField<T>(
  value: unknown,
  emptyValue: T
): OptionalDecimalResult<T> {
  if (value === null || value === undefined || String(value).trim() === "") {
    return { ok: true, value: emptyValue };
  }
  const normalized = normalizeDecimalBodyField(value);
  if (normalized == null) return { ok: false };
  return { ok: true, value: normalized };
}
