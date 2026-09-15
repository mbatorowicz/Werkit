import { describe, expect, it } from "vitest";
import {
  isQuietCompany,
  sortCompaniesByLastAdminLogin,
  toIsoTimestamp,
} from "./platformTenantHealth";

describe("platformTenantHealth", () => {
  it("cicha = active + 0 sesji 30d", () => {
    expect(isQuietCompany({ lifecycleStatus: "active", sessionsLast30Days: 0 })).toBe(true);
    expect(isQuietCompany({ lifecycleStatus: "active", sessionsLast30Days: 1 })).toBe(false);
    expect(isQuietCompany({ lifecycleStatus: "trial", sessionsLast30Days: 0 })).toBe(false);
    expect(isQuietCompany({ lifecycleStatus: "suspended", sessionsLast30Days: 0 })).toBe(false);
  });

  it("toIsoTimestamp: null gdy brak logowania", () => {
    expect(toIsoTimestamp(null)).toBeNull();
    expect(toIsoTimestamp(undefined)).toBeNull();
    expect(toIsoTimestamp("")).toBeNull();
  });

  it("sortuje po lastAdminLoginAt malejąco, nigdy na końcu", () => {
    const rows = sortCompaniesByLastAdminLogin([
      { id: 1, lastAdminLoginAt: null },
      { id: 2, lastAdminLoginAt: "2026-09-01T10:00:00.000Z" },
      { id: 3, lastAdminLoginAt: "2026-09-14T10:00:00.000Z" },
    ]);
    expect(rows.map((r) => r.id)).toEqual([3, 2, 1]);
  });
});
