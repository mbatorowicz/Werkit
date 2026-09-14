import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { loginAttempts } from "@/db/schema";
import {
  LoginRateLimitService,
  MAX_LOGIN_ATTEMPTS,
} from "@/services/LoginRateLimitService";

describe("LoginRateLimitService (Postgres)", () => {
  const key = `__itest-login-limit:${Date.now()}`;

  beforeAll(async () => {
    await LoginRateLimitService.clear(key);
  });

  afterAll(async () => {
    await LoginRateLimitService.clear(key);
  });

  it("5 nieudanych nie blokuje; 6. próba jest ograniczona i widać to z osobnego odczytu DB", async () => {
    for (let i = 0; i < MAX_LOGIN_ATTEMPTS; i += 1) {
      await LoginRateLimitService.recordFailure(key);
      expect(await LoginRateLimitService.isLimited(key)).toBe(i + 1 >= MAX_LOGIN_ATTEMPTS);
    }

    expect(await LoginRateLimitService.isLimited(key)).toBe(true);

    const [row] = await db
      .select({ count: loginAttempts.count })
      .from(loginAttempts)
      .where(eq(loginAttempts.key, key))
      .limit(1);
    expect(row?.count).toBe(MAX_LOGIN_ATTEMPTS);
  });

  it("clear zdejmuje blokadę", async () => {
    await LoginRateLimitService.clear(key);
    expect(await LoginRateLimitService.isLimited(key)).toBe(false);
  });

  it("wygasły wiersz nie blokuje i kolejna porażka resetuje licznik", async () => {
    await db
      .insert(loginAttempts)
      .values({
        key,
        count: MAX_LOGIN_ATTEMPTS,
        resetAt: sql`NOW() - INTERVAL '15 minutes'`,
      })
      .onConflictDoUpdate({
        target: loginAttempts.key,
        set: {
          count: MAX_LOGIN_ATTEMPTS,
          resetAt: sql`NOW() - INTERVAL '15 minutes'`,
        },
      });

    expect(await LoginRateLimitService.isLimited(key)).toBe(false);
    expect(await LoginRateLimitService.recordFailure(key)).toBe(1);
    expect(await LoginRateLimitService.isLimited(key)).toBe(false);
  });
});
