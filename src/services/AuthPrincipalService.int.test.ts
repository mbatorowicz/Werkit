import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { companies, users } from "@/db/schema";
import { requireLivePrincipalOr401 } from "@/lib/livePrincipal";
import { AuthPrincipalService } from "@/services/AuthPrincipalService";
import {
  cleanupTestCompany,
  createTestCompany,
  createTestUser,
  uniqueTestSlug,
} from "@/test/integrationDb";

describe("AuthPrincipalService (integracja z bazą)", () => {
  let companyId: number;
  let userId: number;
  let superadminId: number | null = null;

  beforeAll(async () => {
    const company = await createTestCompany();
    companyId = company.id;
    const user = await createTestUser(companyId, { role: "worker" });
    userId = user.id;
  });

  afterAll(async () => {
    if (superadminId != null) {
      await db.delete(users).where(eq(users.id, superadminId));
    }
    await cleanupTestCompany(companyId);
  });

  it("aktywny user + firma → żywy principal; JWT companyId jest ignorowane", async () => {
    const principal = await AuthPrincipalService.resolve({
      userId,
      role: "admin",
      companyId: 999999,
    });
    expect(principal).toMatchObject({ userId, role: "worker", companyId });
  });

  it("deaktywacja usera → null i 401 z kasowaniem cookie", async () => {
    await db.update(users).set({ isActive: false }).where(eq(users.id, userId));
    await expect(
      AuthPrincipalService.resolve({ userId, role: "worker", companyId })
    ).resolves.toBeNull();

    const denied = await requireLivePrincipalOr401({ userId, role: "worker", companyId });
    expect(denied.ok).toBe(false);
    if (denied.ok) return;
    expect(denied.response.status).toBe(401);
    const setCookie = denied.response.headers.get("set-cookie") ?? "";
    expect(setCookie.toLowerCase()).toContain("auth_token=");
    expect(setCookie.toLowerCase()).toMatch(/max-age=0/);
    expect(setCookie.toLowerCase()).toContain("path=/");

    await db.update(users).set({ isActive: true }).where(eq(users.id, userId));
  });

  it("deaktywacja firmy → null (kolejne API odpada mimo ważnego JWT)", async () => {
    await db.update(companies).set({ isActive: false }).where(eq(companies.id, companyId));
    await expect(
      AuthPrincipalService.resolve({ userId, role: "worker", companyId })
    ).resolves.toBeNull();
    const denied = await requireLivePrincipalOr401({ userId, role: "worker", companyId });
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.response.status).toBe(401);
    await db.update(companies).set({ isActive: true }).where(eq(companies.id, companyId));
  });

  it("zmiana roli w DB jest widoczna od razu", async () => {
    await db.update(users).set({ role: "admin" }).where(eq(users.id, userId));
    const principal = await AuthPrincipalService.resolve({
      userId,
      role: "worker",
      companyId,
    });
    expect(principal?.role).toBe("admin");
    await db.update(users).set({ role: "worker" }).where(eq(users.id, userId));
  });

  it("superadmin bez firmy jest żywy; nieaktywny odpada", async () => {
    const [row] = await db
      .insert(users)
      .values({
        companyId: null,
        fullName: `__ITEST superadmin ${uniqueTestSlug()}`,
        usernameEmail: `${uniqueTestSlug()}@itest.local`,
        passwordHash: "__itest-no-login",
        role: "superadmin",
        isActive: true,
      })
      .returning({ id: users.id });
    superadminId = row.id;

    const live = await AuthPrincipalService.resolve({
      userId: row.id,
      role: "superadmin",
      companyId: null,
    });
    expect(live).toMatchObject({ userId: row.id, role: "superadmin", companyId: null });

    await db.update(users).set({ isActive: false }).where(eq(users.id, row.id));
    await expect(
      AuthPrincipalService.resolve({ userId: row.id, role: "superadmin", companyId: null })
    ).resolves.toBeNull();
  });
});
