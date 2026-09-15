import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { companies, platformAuditEvents, users } from "@/db/schema";
import { signSessionJwt } from "@/lib/auth";
import { AUTH_TOKEN_COOKIE } from "@/lib/authCookie";
import { PlatformAuditService } from "@/services/PlatformAuditService";
import { PlatformTenantUserService } from "@/services/PlatformTenantUserService";
import {
  cleanupTestCompany,
  createTestCompany,
  createTestUser,
  uniqueTestSlug,
} from "@/test/integrationDb";

const AUDIT_SECRET = "Itest-Audit-Secret-482917!";

const createdCompanyIds: number[] = [];
const createdActorIds: number[] = [];

type AuditRow = {
  action: string;
  targetType: string | null;
  targetId: number | null;
  actorUserId: number;
  metadata: unknown;
};

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

function cookieHeader(token: string): string {
  return `${AUTH_TOKEN_COOKIE}=${token}`;
}

function jsonRequest(url: string, method: string, token: string, body: unknown): Request {
  return new Request(url, {
    method,
    headers: {
      "content-type": "application/json",
      cookie: cookieHeader(token),
    },
    body: JSON.stringify(body),
  });
}

function companyParams(id: number): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id: String(id) }) };
}

function companyUserParams(
  companyId: number,
  userId: number
): { params: Promise<{ id: string; userId: string }> } {
  return { params: Promise.resolve({ id: String(companyId), userId: String(userId) }) };
}

function flagParams(companyId: number): { params: Promise<{ companyId: string }> } {
  return { params: Promise.resolve({ companyId: String(companyId) }) };
}

async function selectCompanyAudit(companyId: number): Promise<AuditRow[]> {
  return db
    .select({
      action: platformAuditEvents.action,
      targetType: platformAuditEvents.targetType,
      targetId: platformAuditEvents.targetId,
      actorUserId: platformAuditEvents.actorUserId,
      metadata: platformAuditEvents.metadata,
    })
    .from(platformAuditEvents)
    .where(eq(platformAuditEvents.companyId, companyId));
}

function countAction(rows: AuditRow[], action: string): number {
  return rows.filter((row) => row.action === action).length;
}

function assertNoSecretInAudit(rows: AuditRow[], secret: string): void {
  for (const row of rows) {
    const blob = JSON.stringify(row.metadata ?? {});
    expect(blob).not.toContain(secret);
    expect(blob.toLowerCase()).not.toMatch(/password/);
  }
}

describe("PL3 /api/platform/audit (integracja)", () => {
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
        headers: { cookie: cookieHeader(superJwt) },
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
        headers: { cookie: cookieHeader(superJwt) },
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
        headers: { cookie: cookieHeader(adminJwt) },
      }),
      {}
    );
    expect(adminRes.status).toBe(403);
  });

  it("mutacje company/flags/admin zapisują wiersz; porażka i hasło nie idą do audytu", async () => {
    const superadmin = await createTestSuperadmin();
    const superJwt = await signSessionJwt(
      { userId: superadmin.id, role: "superadmin", companyId: null },
      "7d"
    );

    const slug = uniqueTestSlug();
    const adminEmail = `${uniqueTestSlug()}@itest.local`;
    const { POST: createCompany } = await import("@/app/api/platform/companies/route");
    const createRes = await createCompany(
      jsonRequest("http://localhost/api/platform/companies", "POST", superJwt, {
        name: `__ITEST audit mut ${slug}`,
        slug,
        adminFullName: "__ITEST Audit Admin",
        adminEmail,
        adminPassword: AUDIT_SECRET,
      }),
      {}
    );
    expect(createRes.status).toBe(200);
    const created = (await createRes.json()) as { company: { id: number; slug: string } };
    const companyId = created.company.id;
    createdCompanyIds.push(companyId);

    const { PATCH: patchCompany } = await import("@/app/api/platform/companies/[id]/route");
    const renameRes = await patchCompany(
      jsonRequest(`http://localhost/api/platform/companies/${companyId}`, "PATCH", superJwt, {
        name: `__ITEST audit mut renamed ${slug}`,
      }),
      companyParams(companyId)
    );
    expect(renameRes.status).toBe(200);

    const { PUT: putFlags } = await import("@/app/api/platform/feature-flags/[companyId]/route");
    const flagsRes = await putFlags(
      jsonRequest(
        `http://localhost/api/platform/feature-flags/${companyId}`,
        "PUT",
        superJwt,
        { planKey: "yard" }
      ),
      flagParams(companyId)
    );
    expect(flagsRes.status).toBe(200);

    const firstStaff = await PlatformTenantUserService.listCompanyUsers(companyId);
    expect(firstStaff).toHaveLength(1);
    const firstAdminId = firstStaff[0].id;

    const secondEmail = `${uniqueTestSlug()}@itest.local`;
    const { POST: createAdmin } = await import("@/app/api/platform/companies/[id]/admin/route");
    const adminRes = await createAdmin(
      jsonRequest(`http://localhost/api/platform/companies/${companyId}/admin`, "POST", superJwt, {
        fullName: "__ITEST Audit Admin 2",
        usernameEmail: secondEmail,
        password: AUDIT_SECRET,
      }),
      companyParams(companyId)
    );
    expect(adminRes.status).toBe(200);

    const staffAfterSecond = await PlatformTenantUserService.listCompanyUsers(companyId);
    const secondAdmin = staffAfterSecond.find((u) => u.id !== firstAdminId);
    expect(secondAdmin).toBeDefined();
    if (secondAdmin == null) return;

    const { PATCH: patchUser } = await import(
      "@/app/api/platform/companies/[id]/users/[userId]/route"
    );
    const deactivateRes = await patchUser(
      jsonRequest(
        `http://localhost/api/platform/companies/${companyId}/users/${secondAdmin.id}`,
        "PATCH",
        superJwt,
        { isActive: false }
      ),
      companyUserParams(companyId, secondAdmin.id)
    );
    expect(deactivateRes.status).toBe(200);

    const lastAdminRes = await patchUser(
      jsonRequest(
        `http://localhost/api/platform/companies/${companyId}/users/${firstAdminId}`,
        "PATCH",
        superJwt,
        { isActive: false }
      ),
      companyUserParams(companyId, firstAdminId)
    );
    expect(lastAdminRes.status).toBe(409);
    await expect(lastAdminRes.json()).resolves.toMatchObject({ error: "last_admin" });

    const activateRes = await patchUser(
      jsonRequest(
        `http://localhost/api/platform/companies/${companyId}/users/${secondAdmin.id}`,
        "PATCH",
        superJwt,
        { isActive: true }
      ),
      companyUserParams(companyId, secondAdmin.id)
    );
    expect(activateRes.status).toBe(200);

    const { POST: resetPassword } = await import(
      "@/app/api/platform/companies/[id]/users/[userId]/password/route"
    );
    const weakRes = await resetPassword(
      jsonRequest(
        `http://localhost/api/platform/companies/${companyId}/users/${firstAdminId}/password`,
        "POST",
        superJwt,
        { password: "123456" }
      ),
      companyUserParams(companyId, firstAdminId)
    );
    expect(weakRes.status).toBe(400);
    await expect(weakRes.json()).resolves.toMatchObject({ error: "weak_password" });

    const resetRes = await resetPassword(
      jsonRequest(
        `http://localhost/api/platform/companies/${companyId}/users/${firstAdminId}/password`,
        "POST",
        superJwt,
        { password: AUDIT_SECRET }
      ),
      companyUserParams(companyId, firstAdminId)
    );
    expect(resetRes.status).toBe(200);

    const missingNameRes = await createCompany(
      jsonRequest("http://localhost/api/platform/companies", "POST", superJwt, { name: "   " }),
      {}
    );
    expect(missingNameRes.status).toBe(400);

    const adminJwt = await signSessionJwt(
      { userId: firstAdminId, role: "admin", companyId },
      "7d"
    );
    const ghostSlug = uniqueTestSlug();
    const forbiddenRes = await createCompany(
      jsonRequest("http://localhost/api/platform/companies", "POST", adminJwt, {
        name: `__ITEST ghost ${ghostSlug}`,
        slug: ghostSlug,
      }),
      {}
    );
    expect(forbiddenRes.status).toBe(403);
    const ghostRows = await db
      .select({ id: companies.id })
      .from(companies)
      .where(eq(companies.slug, ghostSlug));
    expect(ghostRows).toHaveLength(0);

    const suspendRes = await patchCompany(
      jsonRequest(`http://localhost/api/platform/companies/${companyId}`, "PATCH", superJwt, {
        isActive: false,
      }),
      companyParams(companyId)
    );
    expect(suspendRes.status).toBe(200);

    const resumeRes = await patchCompany(
      jsonRequest(`http://localhost/api/platform/companies/${companyId}`, "PATCH", superJwt, {
        isActive: true,
      }),
      companyParams(companyId)
    );
    expect(resumeRes.status).toBe(200);

    const archiveRes = await patchCompany(
      jsonRequest(`http://localhost/api/platform/companies/${companyId}`, "PATCH", superJwt, {
        lifecycleStatus: "archived",
      }),
      companyParams(companyId)
    );
    expect(archiveRes.status).toBe(200);

    const rows = await selectCompanyAudit(companyId);
    expect(rows.every((row) => row.actorUserId === superadmin.id)).toBe(true);
    expect(countAction(rows, "company.create")).toBe(1);
    expect(countAction(rows, "company.update")).toBe(1);
    expect(countAction(rows, "flags.update")).toBe(1);
    expect(countAction(rows, "admin.create")).toBe(1);
    expect(countAction(rows, "admin.deactivate")).toBe(1);
    expect(countAction(rows, "admin.activate")).toBe(1);
    expect(countAction(rows, "admin.reset_password")).toBe(1);
    expect(countAction(rows, "company.deactivate")).toBe(1);
    expect(countAction(rows, "company.activate")).toBe(1);
    expect(countAction(rows, "company.archive")).toBe(1);
    assertNoSecretInAudit(rows, AUDIT_SECRET);

    const createRow = rows.find((row) => row.action === "company.create");
    expect(createRow).toMatchObject({
      targetType: "company",
      targetId: companyId,
      metadata: { slug, withAdmin: true },
    });
    const resetRow = rows.find((row) => row.action === "admin.reset_password");
    expect(resetRow).toMatchObject({
      targetType: "user",
      targetId: firstAdminId,
      metadata: null,
    });

    const { GET } = await import("@/app/api/platform/audit/route");
    const listed = await GET(
      new Request(
        `http://localhost/api/platform/audit?companyId=${companyId}&action=flags.update`,
        { headers: { cookie: cookieHeader(superJwt) } }
      ),
      {}
    );
    expect(listed.status).toBe(200);
    const listedBody = (await listed.json()) as { events: { action: string; companyId: number }[] };
    expect(listedBody.events.length).toBeGreaterThan(0);
    expect(listedBody.events.every((e) => e.action === "flags.update")).toBe(true);
    expect(listedBody.events.every((e) => e.companyId === companyId)).toBe(true);
  });
});
