import { db } from "@/db";
import { loginAttempts } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";

/** 5 nieudanych logowań / 15 min — SSOT limitu (Postgres, nie RAM instancji). */
export const MAX_LOGIN_ATTEMPTS = 5;
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;

/**
 * Limit prób logowania w `login_attempts`.
 * Klucz buduje login route: pierwszy hop `x-forwarded-for` + znormalizowany login.
 * Porównania okna wyłącznie przez `NOW()` w Postgresie (timestamp bez TZ ≠ Date JS).
 */
export class LoginRateLimitService {
  static async isLimited(key: string): Promise<boolean> {
    const [row] = await db
      .select({ count: loginAttempts.count })
      .from(loginAttempts)
      .where(and(eq(loginAttempts.key, key), sql`${loginAttempts.resetAt} > NOW()`))
      .limit(1);
    return (row?.count ?? 0) >= MAX_LOGIN_ATTEMPTS;
  }

  /** Inkrement atomowy (przeżywa cold start / inną instancję Vercel). Zwraca nowy count. */
  static async recordFailure(key: string): Promise<number> {
    const [row] = await db
      .insert(loginAttempts)
      .values({
        key,
        count: 1,
        resetAt: sql`NOW() + INTERVAL '15 minutes'`,
      })
      .onConflictDoUpdate({
        target: loginAttempts.key,
        set: {
          count: sql`CASE WHEN ${loginAttempts.resetAt} <= NOW() THEN 1 ELSE ${loginAttempts.count} + 1 END`,
          resetAt: sql`CASE WHEN ${loginAttempts.resetAt} <= NOW() THEN NOW() + INTERVAL '15 minutes' ELSE ${loginAttempts.resetAt} END`,
        },
      })
      .returning({ count: loginAttempts.count });

    return row?.count ?? 1;
  }

  static async clear(key: string): Promise<void> {
    await db.delete(loginAttempts).where(eq(loginAttempts.key, key));
  }
}

export async function isLoginRateLimited(key: string): Promise<boolean> {
  return LoginRateLimitService.isLimited(key);
}

export async function recordLoginFailure(key: string): Promise<number> {
  return LoginRateLimitService.recordFailure(key);
}

export async function clearLoginRateLimit(key: string): Promise<void> {
  return LoginRateLimitService.clear(key);
}
