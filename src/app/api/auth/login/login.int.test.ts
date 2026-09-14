import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { companies, users } from "@/db/schema";
import { hashPassword } from "@/lib/passwordCrypto";
import { LoginRateLimitService, MAX_LOGIN_ATTEMPTS } from "@/services/LoginRateLimitService";
import { cleanupTestCompany, createTestCompany, createTestUser } from "@/test/integrationDb";

const GOOD_PASSWORD = "Itest-login-482917";

async function postLogin(
  usernameEmail: string,
  password: string,
  ip = "203.0.113.88"
): Promise<Response> {
  const { POST } = await import("@/app/api/auth/login/route");
  return POST(
    new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": ip,
      },
      body: JSON.stringify({ usernameEmail, password }),
    }),
    {}
  );
}

async function jsonErrorOf(res: Response): Promise<{ status: number; error: unknown }> {
  const body: unknown = await res.json();
  const error =
    body && typeof body === "object" && "error" in body ? (body as { error: unknown }).error : body;
  return { status: res.status, error };
}

describe("POST /api/auth/login (S1)", () => {
  let companyId: number;
  let usernameEmail: string;
  const ghostUser = `__itest-ghost-${Date.now()}@itest.local`;
  const clientIp = `203.0.113.${(Date.now() % 200) + 10}`;

  beforeAll(async () => {
    const company = await createTestCompany();
    companyId = company.id;
    const passwordHash = await hashPassword(GOOD_PASSWORD, 10);
    const user = await createTestUser(companyId, { role: "worker", passwordHash });
    usernameEmail = user.usernameEmail;
  });

  afterAll(async () => {
    await LoginRateLimitService.clear(`${clientIp}:${usernameEmail}`);
    await LoginRateLimitService.clear(`${clientIp}:${ghostUser}`);
    await cleanupTestCompany(companyId);
  });

  it("nieistniejący user i złe hasło zwracają ten sam 401 invalid_credentials", async () => {
    const ghost = await jsonErrorOf(await postLogin(ghostUser, "zle-haslo-999", clientIp));
    const wrong = await jsonErrorOf(await postLogin(usernameEmail, "zle-haslo-999", clientIp));
    expect(ghost).toEqual({ status: 401, error: "invalid_credentials" });
    expect(wrong).toEqual({ status: 401, error: "invalid_credentials" });
  });

  it("nieaktywny user i nieaktywna firma też 401 — bez account_blocked", async () => {
    const [userRow] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.usernameEmail, usernameEmail))
      .limit(1);
    const userId = userRow?.id;
    expect(userId).toBeDefined();
    if (userId == null) return;

    await db.update(users).set({ isActive: false }).where(eq(users.id, userId));
    const blocked = await jsonErrorOf(await postLogin(usernameEmail, GOOD_PASSWORD, clientIp));
    expect(blocked).toEqual({ status: 401, error: "invalid_credentials" });
    await db.update(users).set({ isActive: true }).where(eq(users.id, userId));

    await db.update(companies).set({ isActive: false }).where(eq(companies.id, companyId));
    const companyOff = await jsonErrorOf(await postLogin(usernameEmail, GOOD_PASSWORD, clientIp));
    expect(companyOff).toEqual({ status: 401, error: "invalid_credentials" });
    await db.update(companies).set({ isActive: true }).where(eq(companies.id, companyId));
  });

  it("firma zarchiwizowana też 401 invalid_credentials", async () => {
    const { PlatformCompanyService } = await import("@/services/PlatformCompanyService");
    await PlatformCompanyService.updateCompany(companyId, { lifecycleStatus: "archived" });
    const archived = await jsonErrorOf(await postLogin(usernameEmail, GOOD_PASSWORD, clientIp));
    expect(archived).toEqual({ status: 401, error: "invalid_credentials" });
    await PlatformCompanyService.updateCompany(companyId, { lifecycleStatus: "active" });
  });

  it("6. nieudana próba zwraca 429; sukces czyści limit", async () => {
    const burstIp = `198.51.100.${(Date.now() % 200) + 20}`;
    const burstKey = `${burstIp}:${usernameEmail}`;
    await LoginRateLimitService.clear(burstKey);

    for (let i = 0; i < MAX_LOGIN_ATTEMPTS; i += 1) {
      const fail = await jsonErrorOf(await postLogin(usernameEmail, "zle-haslo-burst", burstIp));
      expect(fail).toEqual({ status: 401, error: "invalid_credentials" });
    }

    const limited = await jsonErrorOf(await postLogin(usernameEmail, "zle-haslo-burst", burstIp));
    expect(limited).toEqual({ status: 429, error: "too_many_attempts" });

    await LoginRateLimitService.clear(burstKey);
    const ok = await postLogin(usernameEmail, GOOD_PASSWORD, burstIp);
    expect(ok.status).toBe(200);
    const body: unknown = await ok.json();
    expect(body).toMatchObject({ success: true, user: { role: "worker" } });
    expect(await LoginRateLimitService.isLimited(burstKey)).toBe(false);
  });

  it("udane logowanie zapisuje last_login_at; porażka nie rusza pola", async () => {
    const loginIp = `203.0.113.${(Date.now() % 50) + 40}`;
    const passwordHash = await hashPassword(GOOD_PASSWORD, 10);
    const loginUser = await createTestUser(companyId, { role: "admin", passwordHash });

    const [before] = await db
      .select({ lastLoginAt: users.lastLoginAt })
      .from(users)
      .where(eq(users.id, loginUser.id))
      .limit(1);
    expect(before?.lastLoginAt).toBeNull();

    const fail = await jsonErrorOf(
      await postLogin(loginUser.usernameEmail, "zle-haslo-999", loginIp)
    );
    expect(fail).toEqual({ status: 401, error: "invalid_credentials" });
    const [afterFail] = await db
      .select({ lastLoginAt: users.lastLoginAt })
      .from(users)
      .where(eq(users.id, loginUser.id))
      .limit(1);
    expect(afterFail?.lastLoginAt).toBeNull();

    const ok = await postLogin(loginUser.usernameEmail, GOOD_PASSWORD, loginIp);
    expect(ok.status).toBe(200);
    const [afterOk] = await db
      .select({ lastLoginAt: users.lastLoginAt })
      .from(users)
      .where(eq(users.id, loginUser.id))
      .limit(1);
    expect(afterOk?.lastLoginAt).toBeInstanceOf(Date);
  });
});
