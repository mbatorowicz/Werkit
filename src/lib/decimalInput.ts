/**
 * Parsowanie i normalizacja liczb dziesiętnych z UI (przecinek lub kropka).
 * SSOT dla cen, ilości magazynowych, ton itp.
 */

/** Zamienia przecinek na kropkę (bez parsowania). */
export function normalizeDecimalSeparator(value: string): string {
  return value.trim().replace(",", ".");
}

/** Ogranicza wpisywanie do cyfr i jednego separatora dziesiętnego (, lub .). */
export function sanitizeDecimalTyping(value: string): string {
  let out = "";
  let sepSeen = false;
  for (const ch of value) {
    if (ch >= "0" && ch <= "9") {
      out += ch;
      continue;
    }
    if ((ch === "," || ch === ".") && !sepSeen) {
      out += ch;
      sepSeen = true;
    }
  }
  return out;
}

/** Parsuje liczbę z ciągu (akceptuje , i .). */
export function parseDecimalInput(value: string): number | null {
  const normalized = normalizeDecimalSeparator(value);
  if (normalized === "" || normalized === "." || normalized === "-") return null;
  const n = Number.parseFloat(normalized);
  return Number.isFinite(n) ? n : null;
}

/** Wartość do zapisu w API/DB (kropka) lub null przy pustym / niepoprawnym. */
export function decimalStringForStorage(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const n = parseDecimalInput(trimmed);
  if (n == null) return null;
  return String(n);
}

/** Pola z body JSON (string lub number). */
export function normalizeDecimalBodyField(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    return String(value);
  }
  if (typeof value === "string") {
    return decimalStringForStorage(value);
  }
  return null;
}

/** Dodatnia liczba do walidacji ilości / ceny. */
export function parsePositiveDecimalField(
  value: unknown
): { ok: true; value: string } | { ok: false } {
  const stored = normalizeDecimalBodyField(value);
  if (stored == null) return { ok: false };
  const n = parseDecimalInput(stored);
  if (n == null || n <= 0) return { ok: false };
  return { ok: true, value: stored };
}
