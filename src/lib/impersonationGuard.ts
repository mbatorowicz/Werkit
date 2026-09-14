/**
 * Czyste helpery impersonacji — bez DB, bezpieczne na Edge (`proxy.ts`).
 */

export const IMPERSONATION_START_PATH = "/api/platform/impersonation";
export const IMPERSONATION_END_PATH = "/api/platform/impersonation/end";
export const IMPERSONATION_REASON_MAX_LENGTH = 200;
export const IMPERSONATION_JWT_EXPIRES_IN = "30m";

export function readImpersonatorUserId(payload: unknown): number | null {
  if (!payload || typeof payload !== "object") return null;
  const v = (payload as { impersonatorUserId?: unknown }).impersonatorUserId;
  if (typeof v === "number" && Number.isInteger(v) && v >= 1) return v;
  if (typeof v === "string" && /^\d+$/.test(v)) {
    const n = Number(v);
    if (Number.isInteger(n) && n >= 1) return n;
  }
  return null;
}

export function isImpersonationEndApi(pathname: string, method: string): boolean {
  return method === "POST" && pathname === IMPERSONATION_END_PATH;
}

export function isImpersonationStatusApi(pathname: string, method: string): boolean {
  return method === "GET" && pathname === IMPERSONATION_START_PATH;
}

export function normalizeImpersonationReason(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim().slice(0, IMPERSONATION_REASON_MAX_LENGTH);
  return trimmed.length > 0 ? trimmed : null;
}
