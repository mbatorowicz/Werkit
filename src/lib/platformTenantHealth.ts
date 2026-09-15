import type { CompanyLifecycleStatus } from "@/lib/companyLifecycle";

/** Firma „żywa” w cyklu, ale bez sesji terenowych od 30 dni. */
export function isQuietCompany(row: {
  lifecycleStatus: CompanyLifecycleStatus;
  sessionsLast30Days: number;
}): boolean {
  return row.lifecycleStatus === "active" && row.sessionsLast30Days === 0;
}

/** ISO timestamptz albo null — spójne SSR i JSON API. */
export function toIsoTimestamp(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const ms = Date.parse(trimmed);
    return Number.isNaN(ms) ? null : new Date(ms).toISOString();
  }
  const ms = value.getTime();
  return Number.isNaN(ms) ? null : value.toISOString();
}

/** Sortowanie overview: ostatnie logowanie admina malejąco, nigdy na końcu. */
export function sortCompaniesByLastAdminLogin<T extends { lastAdminLoginAt: string | null }>(
  rows: T[]
): T[] {
  return [...rows].sort((a, b) => {
    if (a.lastAdminLoginAt == null && b.lastAdminLoginAt == null) return 0;
    if (a.lastAdminLoginAt == null) return 1;
    if (b.lastAdminLoginAt == null) return -1;
    return b.lastAdminLoginAt.localeCompare(a.lastAdminLoginAt);
  });
}
