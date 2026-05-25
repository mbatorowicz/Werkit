/** Wspólne helpery do zawężania typów z nieznanych odpowiedzi API. */

export function isRecord(u: unknown): u is Record<string, unknown> {
  return u !== null && typeof u === "object" && !Array.isArray(u);
}

export function narrowNumberArray(v: unknown): number[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is number => typeof x === "number");
}

export function narrowStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
}

export function readBool(r: Record<string, unknown>, k: string, fallback: boolean): boolean {
  return typeof r[k] === "boolean" ? r[k] : fallback;
}

export function narrowPriority(p: unknown): import("@/types/worker").WorkOrderPriority | null {
  if (p === "URGENT" || p === "HIGH" || p === "NORMAL" || p === "LOW") return p;
  return null;
}
