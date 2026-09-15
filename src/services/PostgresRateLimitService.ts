import { db } from "@/db";
import { loginAttempts } from "@/db/schema";
import { and, eq, sql, type SQL } from "drizzle-orm";

/**
 * Ogólny licznik w tabeli `login_attempts` (S1 logowanie, S2 logi, S3 geocode, S4 eksport).
 * Klucz jest dowolnym tekstem — prefiksy `logs:` / `geocode:` nie kolidują z `ip:login`.
 * Okno wyłącznie przez `NOW()` w Postgresie (timestamp bez TZ ≠ Date JS).
 */
export type RateLimitWindowSql = "1 minute" | "15 minutes";

function nowPlusInterval(window: RateLimitWindowSql): SQL {
  return window === "1 minute"
    ? sql`NOW() + INTERVAL '1 minute'`
    : sql`NOW() + INTERVAL '15 minutes'`;
}

function resetAtOnConflict(window: RateLimitWindowSql): SQL {
  return window === "1 minute"
    ? sql`CASE WHEN ${loginAttempts.resetAt} <= NOW() THEN NOW() + INTERVAL '1 minute' ELSE ${loginAttempts.resetAt} END`
    : sql`CASE WHEN ${loginAttempts.resetAt} <= NOW() THEN NOW() + INTERVAL '15 minutes' ELSE ${loginAttempts.resetAt} END`;
}

export class PostgresRateLimitService {
  static async isLimited(key: string, max: number): Promise<boolean> {
    const [row] = await db
      .select({ count: loginAttempts.count })
      .from(loginAttempts)
      .where(and(eq(loginAttempts.key, key), sql`${loginAttempts.resetAt} > NOW()`))
      .limit(1);
    return (row?.count ?? 0) >= max;
  }

  static async record(key: string, window: RateLimitWindowSql): Promise<number> {
    const [row] = await db
      .insert(loginAttempts)
      .values({
        key,
        count: 1,
        resetAt: nowPlusInterval(window),
      })
      .onConflictDoUpdate({
        target: loginAttempts.key,
        set: {
          count: sql`CASE WHEN ${loginAttempts.resetAt} <= NOW() THEN 1 ELSE ${loginAttempts.count} + 1 END`,
          resetAt: resetAtOnConflict(window),
        },
      })
      .returning({ count: loginAttempts.count });

    return row?.count ?? 1;
  }

  static async clear(key: string): Promise<void> {
    await db.delete(loginAttempts).where(eq(loginAttempts.key, key));
  }
}
