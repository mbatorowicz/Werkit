import { PostgresRateLimitService } from "@/services/PostgresRateLimitService";

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
    return PostgresRateLimitService.isLimited(key, MAX_LOGIN_ATTEMPTS);
  }

  /** Inkrement atomowy (przeżywa cold start / inną instancję Vercel). Zwraca nowy count. */
  static async recordFailure(key: string): Promise<number> {
    return PostgresRateLimitService.record(key, "15 minutes");
  }

  static async clear(key: string): Promise<void> {
    return PostgresRateLimitService.clear(key);
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
