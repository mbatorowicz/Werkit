import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { platformAuditEvents, users } from "@/db/schema";
import { signSessionJwt } from "@/lib/auth";
import { AUTH_TOKEN_COOKIE } from "@/lib/authCookie";
import { PlatformAuditService } from "@/services/PlatformAuditService";
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
      fullName: "__ITEST superadmin audit",
      usernameEmail: `${uniqueTestSlug()}@itest.local`,
      passwordHash: "__itest-no-login",
      role: "superadmin",
      isActive: true,
    })
    .returning({ id: users.id });
  createdActorIds.push(row.id);
  return row;
}

describe("PL3 GET /api/platform/audit (integracja)", () => {
  afterAll(async () => {
    for (const actorId of createdActorIds) {
      await db.delete(platformAuditEvents).where(eq(platformAuditEvents.actorUserId, actorId));
      await db.delete(users).where(eq(users.id, actorId));
    }
    for (const id of createdCompanyIds) {
      await cleanupTestCompany(id);
    }
  });

  it("superadmin 200; filtr companyId nie wycieka wierszy innej firmy; admin firmy 403", async () => {
    const companyA = await createTestCompany();
    const companyB = await createTestCompany();
    createdCompanyIds.push(companyA.id, companyB.id);
    const adminA = await createTestUser(companyA.id, { role: "admin" });
    const superadmin = await createTestSuperadmin();

    await PlatformAuditService.insert({
      actorUserId: superadmin.id,
      companyId: companyA.id,
      action: "company.create",
      targetType: "company",
      targetId: companyA.id,
    });
    await PlatformAuditService.insert({
      actorUserId: superadmin.id,
      companyId: companyB.id,
      action: "flags.update",
      targetType: "flags",
      targetId: companyB.id,
    });

    const superJwt = await signSessionJwt(
      { userId: superadmin.id, role: "superadmin", companyId: null },
      "7d"
    );
    const adminJwt = await signSessionJwt(
      { userId: adminA.id, role: "admin", companyId: companyA.id },
      "7d"
    );

    const { GET } = await import("@/app/api/platform/audit/route");

    const superRes = await GET(
      new Request("http://localhost/api/platform/audit?limit=100", {
        headers: { cookie: `${AUTH_TOKEN_COOKIE}=${superJwt}` },
      }),
      {}
    );
    expect(superRes.status).toBe(200);
    const superBody = (await superRes.json()) as { events: { companyId: number | null; action: string }[] };
    expect(Array.isArray(superBody.events)).toBe(true);
    const fromAorB = superBody.events.filter(
      (e) => e.companyId === companyA.id || e.companyId === companyB.id
    );
    expect(fromAorB.some((e) => e.companyId === companyA.id)).toBe(true);
    expect(fromAorB.some((e) => e.companyId === companyB.id)).toBe(true);

    const filteredRes = await GET(
      new Request(`http://localhost/api/platform/audit?companyId=${companyA.id}`, {
        headers: { cookie: `${AUTH_TOKEN_COOKIE}=${superJwt}` },
      }),
      {}
    );
    expect(filteredRes.status).toBe(200);
    const filteredBody = (await filteredRes.json()) as {
      events: { companyId: number | null }[];
    };
    expect(filteredBody.events.every((e) => e.companyId === companyA.id)).toBe(true);
    expect(filteredBody.events.some((e) => e.companyId === companyB.id)).toBe(false);

    const adminRes = await GET(
      new Request("http://localhost/api/platform/audit", {
        headers: { cookie: `${AUTH_TOKEN_COOKIE}=${adminJwt}` },
      }),
      {}
    );
    expect(adminRes.status).toBe(403);
  });
});
