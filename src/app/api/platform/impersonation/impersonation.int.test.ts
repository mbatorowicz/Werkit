import { afterAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { companies, platformAuditEvents, users } from "@/db/schema";
import { parseAuthToken, signSessionJwt } from "@/lib/auth";
import { AUTH_TOKEN_COOKIE, PLATFORM_RESUME_COOKIE } from "@/lib/authCookie";
import { AuthPrincipalService } from "@/services/AuthPrincipalService";
import { AdminUserService } from "@/services/AdminUserService";
import {
  PlatformImpersonationError,
  PlatformImpersonationService,
} from "@/services/PlatformImpersonationService";
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
      fullName: "__ITEST superadmin impersonation",
      usernameEmail: `${uniqueTestSlug()}@itest.local`,
      passwordHash: "__itest-no-login",
      role: "superadmin",
      isActive: true,
    })
    .returning({ id: users.id });
  createdActorIds.push(row.id);
  return row;
}

function cookieHeader(parts: Record<string, string>): string {
  return Object.entries(parts)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

function readSetCookie(res: Response, name: string): string | undefined {
  const fromApi = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  const list =
    fromApi.length > 0 ? fromApi : (res.headers.get("set-cookie") ?? "").split(/,(?=\s*[^;]+=)/);
  for (const entry of list) {
    const match = entry.trim().match(new RegExp(`^${name}=([^;]*)`));
    if (match) return match[1];
  }
  return undefined;
}

describe("PL1 impersonacja (integracja)", () => {
  afterAll(async () => {
    for (const actorId of createdActorIds) {
      await db.delete(platformAuditEvents).where(eq(platformAuditEvents.actorUserId, actorId));
      await db.delete(users).where(eq(users.id, actorId));
    }
    for (const id of createdCompanyIds) {
      await cleanupTestCompany(id);
    }
  });

  it("serwis: worker i nieaktywne konto/firma odrzucone", async () => {
    const company = await createTestCompany();
    createdCompanyIds.push(company.id);
    const worker = await createTestUser(company.id, { role: "worker" });
    const inactiveAdmin = await createTestUser(company.id, { role: "admin", isActive: false });

    await expect(
      PlatformImpersonationService.resolveStartTarget(company.id, worker.id)
    ).rejects.toBeInstanceOf(PlatformImpersonationError);
    await expect(
      PlatformImpersonationService.resolveStartTarget(company.id, inactiveAdmin.id)
    ).rejects.toMatchObject({ message: "user_inactive" });

    await db.update(companies).set({ isActive: false }).where(eq(companies.id, company.id));
    const otherAdmin = await createTestUser(company.id, { role: "admin" });
    await expect(
      PlatformImpersonationService.resolveStartTarget(company.id, otherAdmin.id)
    ).rejects.toMatchObject({ message: "company_inactive" });
  });

  it("start → principal celu + izolacja listy userów; end przywraca superadmina", async () => {
    const companyA = await createTestCompany();
    const companyB = await createTestCompany();
    createdCompanyIds.push(companyA.id, companyB.id);
    const adminA = await createTestUser(companyA.id, { role: "admin" });
    await createTestUser(companyB.id, { role: "admin" });
    const superadmin = await createTestSuperadmin();

    const superJwt = await signSessionJwt(
      { userId: superadmin.id, role: "superadmin", companyId: null },
      "7d"
    );

    const { GET, POST: startImpersonation } = await import(
      "@/app/api/platform/impersonation/route"
    );
    const startRes = await startImpersonation(
      new Request("http://localhost/api/platform/impersonation", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: cookieHeader({ [AUTH_TOKEN_COOKIE]: superJwt }),
        },
        body: JSON.stringify({
          companyId: companyA.id,
          targetUserId: adminA.id,
          reason: "zgłoszenie test",
        }),
      }),
      {}
    );
    expect(startRes.status).toBe(200);
    const supportJwt = readSetCookie(startRes, AUTH_TOKEN_COOKIE);
    const resumeJwt = readSetCookie(startRes, PLATFORM_RESUME_COOKIE);
    expect(supportJwt).toBeTruthy();
    expect(resumeJwt).toBe(superJwt);

    const supportSession = await parseAuthToken(supportJwt);
    expect(supportSession).toMatchObject({
      userId: adminA.id,
      role: "admin",
      companyId: companyA.id,
      impersonatorUserId: superadmin.id,
    });

    const principal = await AuthPrincipalService.resolve(supportSession!);
    expect(principal).toMatchObject({
      userId: adminA.id,
      role: "admin",
      companyId: companyA.id,
      impersonatorUserId: superadmin.id,
    });

    const usersA = await AdminUserService.getAllUsers(principal!.companyId!);
    expect(usersA.some((u) => u.id === adminA.id)).toBe(true);
    expect(usersA.every((u) => u.companyId === companyA.id)).toBe(true);

    const statusRes = await GET(
      new Request("http://localhost/api/platform/impersonation", {
        headers: { cookie: cookieHeader({ [AUTH_TOKEN_COOKIE]: supportJwt! }) },
      }),
      {}
    );
    expect(statusRes.status).toBe(200);
    await expect(statusRes.json()).resolves.toMatchObject({
      active: true,
      companyId: companyA.id,
      targetUserId: adminA.id,
      impersonatorUserId: superadmin.id,
    });

    const auditStart = await db
      .select({ action: platformAuditEvents.action })
      .from(platformAuditEvents)
      .where(
        and(
          eq(platformAuditEvents.actorUserId, superadmin.id),
          eq(platformAuditEvents.action, "impersonation.start")
        )
      );
    expect(auditStart.length).toBeGreaterThan(0);

    const { POST: endImpersonation } = await import("@/app/api/platform/impersonation/end/route");
    const endRes = await endImpersonation(
      new Request("http://localhost/api/platform/impersonation/end", {
        method: "POST",
        headers: {
          cookie: cookieHeader({
            [AUTH_TOKEN_COOKIE]: supportJwt!,
            [PLATFORM_RESUME_COOKIE]: resumeJwt!,
          }),
        },
      }),
      {}
    );
    expect(endRes.status).toBe(200);
    const restored = readSetCookie(endRes, AUTH_TOKEN_COOKIE);
    expect(restored).toBe(superJwt);
    const restoredSession = await parseAuthToken(restored);
    const restoredPrincipal = await AuthPrincipalService.resolve(restoredSession!);
    expect(restoredPrincipal).toMatchObject({
      userId: superadmin.id,
      role: "superadmin",
      companyId: null,
    });

    const auditEnd = await db
      .select({ action: platformAuditEvents.action })
      .from(platformAuditEvents)
      .where(
        and(
          eq(platformAuditEvents.actorUserId, superadmin.id),
          eq(platformAuditEvents.action, "impersonation.end")
        )
      );
    expect(auditEnd.length).toBeGreaterThan(0);
  });

  it("GET status bez impersonacji; start na nieaktywnej firmie 403", async () => {
    const company = await createTestCompany();
    createdCompanyIds.push(company.id);
    const admin = await createTestUser(company.id, { role: "admin" });
    const superadmin = await createTestSuperadmin();
    const superJwt = await signSessionJwt(
      { userId: superadmin.id, role: "superadmin", companyId: null },
      "7d"
    );

    const { GET, POST } = await import("@/app/api/platform/impersonation/route");
    const idle = await GET(
      new Request("http://localhost/api/platform/impersonation", {
        headers: { cookie: cookieHeader({ [AUTH_TOKEN_COOKIE]: superJwt }) },
      }),
      {}
    );
    expect(idle.status).toBe(200);
    await expect(idle.json()).resolves.toMatchObject({ active: false });

    await db.update(companies).set({ isActive: false }).where(eq(companies.id, company.id));
    const denied = await POST(
      new Request("http://localhost/api/platform/impersonation", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: cookieHeader({ [AUTH_TOKEN_COOKIE]: superJwt }),
        },
        body: JSON.stringify({ companyId: company.id, targetUserId: admin.id }),
      }),
      {}
    );
    expect(denied.status).toBe(403);
    await expect(denied.json()).resolves.toMatchObject({ error: "company_inactive" });
  });
});
