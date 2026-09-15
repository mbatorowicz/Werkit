import { afterAll, describe, expect, it } from "vitest";
import { PlatformAnalyticsService } from "@/services/PlatformAnalyticsService";
import { cleanupTestCompany, createTestCompany, createTestUser } from "@/test/integrationDb";

const createdCompanyIds: number[] = [];

describe("PL3 PlatformAnalyticsService zdrowie tenanta (integracja)", () => {
  afterAll(async () => {
    for (const id of createdCompanyIds) {
      await cleanupTestCompany(id);
    }
  });

  it("firma bez logowań → lastAdminLoginAt: null", async () => {
    const company = await createTestCompany();
    createdCompanyIds.push(company.id);
    await createTestUser(company.id, { role: "admin" });

    const overview = await PlatformAnalyticsService.getCompaniesUsageOverview();
    const row = overview.find((r) => r.companyId === company.id);
    expect(row).toBeDefined();
    expect(row?.lastAdminLoginAt).toBeNull();
    expect(row?.lastWorkerLoginAt).toBeNull();
    expect(row?.activeSessionsNow).toBe(0);
    expect(row?.errorLogsLast24h).toBe(0);
  });
});
