import { afterAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { platformAuditEvents, users } from "@/db/schema";
import { hashPassword } from "@/lib/passwordCrypto";
import { PlatformAuditService } from "@/services/PlatformAuditService";
import { PlatformTenantUserService } from "@/services/PlatformTenantUserService";
import {
  cleanupTestCompany,
  createTestCompany,
  createTestUser,
  uniqueTestSlug,
} from "@/test/integrationDb";

const createdCompanyIds: number[] = [];
const createdActorIds: number[] = [];

async function createTestSuperadmin(): Promise<{ id: number }> {
  const [row] = await db
    .insert(users)
    .values({
      companyId: null,
      fullName: "__ITEST superadmin",
      usernameEmail: `${uniqueTestSlug()}@itest.local`,
      passwordHash: "__itest-no-login",
      role: "superadmin",
      isActive: true,
    })
    .returning({ id: users.id });
  createdActorIds.push(row.id);
  return row;
}

describe("PlatformTenantUserService (integracja z bazą)", () => {
  afterAll(async () => {
    for (const actorId of createdActorIds) {
      await db.delete(platformAuditEvents).where(eq(platformAuditEvents.actorUserId, actorId));
      await db.delete(users).where(eq(users.id, actorId));
    }
    for (const id of createdCompanyIds) {
      await cleanupTestCompany(id);
    }
  });

  it("lista firmy B nie zawiera kont firmy A; PATCH obcego usera → not_found", async () => {
    const companyA = await createTestCompany();
    const companyB = await createTestCompany();
    createdCompanyIds.push(companyA.id, companyB.id);

    const adminA = await createTestUser(companyA.id, { role: "admin" });
    const viewerB = await createTestUser(companyB.id, { role: "viewer" });
    await createTestUser(companyA.id, { role: "worker" });

    const listedB = await PlatformTenantUserService.listCompanyUsers(companyB.id);
    expect(listedB.map((u) => u.id)).toEqual([viewerB.id]);
    expect(listedB.every((u) => !("passwordHash" in u))).toBe(true);

    const listedA = await PlatformTenantUserService.listCompanyUsers(companyA.id);
    expect(listedA.map((u) => u.id)).toEqual([adminA.id]);

    await expect(
      PlatformTenantUserService.setUserActive(companyA.id, viewerB.id, false, 1)
    ).rejects.toThrow("not_found");
    await expect(
      PlatformTenantUserService.resetPassword(companyA.id, viewerB.id, "hash", 1)
    ).rejects.toThrow("not_found");
  });

  it("deaktywacja jedynego aktywnego admina rzuca last_admin", async () => {
    const company = await createTestCompany();
    createdCompanyIds.push(company.id);
    const admin = await createTestUser(company.id, { role: "admin" });
    await createTestUser(company.id, { role: "viewer" });

    await expect(
      PlatformTenantUserService.setUserActive(company.id, admin.id, false, 1)
    ).rejects.toThrow("last_admin");

    const second = await createTestUser(company.id, { role: "admin" });
    const updated = await PlatformTenantUserService.setUserActive(company.id, admin.id, false, 1);
    expect(updated.isActive).toBe(false);

    const [row] = await db
      .select({ isActive: users.isActive })
      .from(users)
      .where(and(eq(users.id, admin.id), eq(users.companyId, company.id)));
    expect(row?.isActive).toBe(false);
    expect(second.id).toBeGreaterThan(0);
  });

  it("reset hasła nie wycieka hash i audyt nie zawiera password", async () => {
    const company = await createTestCompany();
    createdCompanyIds.push(company.id);
    const admin = await createTestUser(company.id, { role: "admin" });
    const actor = await createTestSuperadmin();
    const newHash = await hashPassword("Itest-reset-123!");

    await PlatformTenantUserService.resetPassword(company.id, admin.id, newHash, actor.id);
    await PlatformAuditService.insert({
      actorUserId: actor.id,
      companyId: company.id,
      action: "admin.reset_password",
      targetType: "user",
      targetId: admin.id,
      metadata: { password: "nie-wolno", note: "ok" },
    });

    const listed = await PlatformTenantUserService.listCompanyUsers(company.id);
    expect(listed[0]).not.toHaveProperty("passwordHash");

    const [event] = await db
      .select()
      .from(platformAuditEvents)
      .where(eq(platformAuditEvents.companyId, company.id))
      .limit(1);
    expect(event?.action).toBe("admin.reset_password");
    expect(event?.metadata).toEqual({ note: "ok" });
    expect(JSON.stringify(event?.metadata ?? {})).not.toMatch(/nie-wolno|password/i);
  });
});
