import { describe, expect, it } from "vitest";
import {
  narrowCompanyUsageRows,
  narrowPlatformAuditEvents,
  narrowPlatformTenantUsers,
} from "./platform";

describe("narrowPlatformTenantUsers", () => {
  it("odrzuca obiekt błędu 500 i wiersze bez id", () => {
    expect(narrowPlatformTenantUsers({ error: "server_error" })).toEqual([]);
    expect(
      narrowPlatformTenantUsers([
        {
          id: 3,
          fullName: "Anna",
          usernameEmail: "a@x.pl",
          role: "admin",
          isActive: true,
          lastLoginAt: null,
        },
        { fullName: "brak id", role: "admin" },
        { id: 4, role: "worker", fullName: "Worker", usernameEmail: "w@x.pl", isActive: true },
      ])
    ).toEqual([
      {
        id: 3,
        fullName: "Anna",
        usernameEmail: "a@x.pl",
        role: "admin",
        isActive: true,
        lastLoginAt: null,
      },
    ]);
  });
});

describe("narrowCompanyUsageRows / audit", () => {
  it("firma bez logowań ma lastAdminLoginAt null; odrzuca obiekt błędu", () => {
    expect(narrowCompanyUsageRows({ error: "server_error" })).toEqual([]);
    const rows = narrowCompanyUsageRows([
      {
        companyId: 1,
        companyName: "Cicha",
        slug: "cicha",
        isActive: true,
        lifecycleStatus: "active",
        planKey: "field_ops",
        internalNote: null,
        userCount: 1,
        workerCount: 0,
        sessionsLast30Days: 0,
        pendingOrders: 0,
        deviceLogsLast7Days: 0,
        lastAdminLoginAt: null,
        lastWorkerLoginAt: null,
        activeSessionsNow: 0,
        errorLogsLast24h: 0,
      },
      { companyName: "bez id" },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].lastAdminLoginAt).toBeNull();
    expect(rows[0].errorLogsLast24h).toBe(0);
  });

  it("narrowPlatformAuditEvents odrzuca obiekt 500 i wiersze bez akcji z allowlisty", () => {
    expect(narrowPlatformAuditEvents({ error: "Forbidden" })).toEqual([]);
    const events = narrowPlatformAuditEvents([
      {
        id: 9,
        createdAt: "2026-09-15T10:00:00.000Z",
        actorUserId: 2,
        actorName: "Super",
        companyId: 4,
        companyName: "Acme",
        action: "company.create",
        targetType: "company",
        targetId: 4,
      },
      { id: 10, action: "drop_table", actorUserId: 2, createdAt: "2026-09-15T10:00:00.000Z" },
    ]);
    expect(events).toHaveLength(1);
    expect(events[0].action).toBe("company.create");
  });
});
