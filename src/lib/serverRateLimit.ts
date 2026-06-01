/**
 * Rate limiting po stronie serwera (w pamięci).
 * Używane do ograniczania prób logowania i innych wrażliwych endpointów.
 *
 * Ostrzeżenie: w środowisku serverless (Vercel) każda instancja ma własną pamięć.
 * To wystarcza do ograniczenia brute-force na pojedynczej instancji.
 * Dla pełnego rate limitu w Vercel użyj zewnętrznego store'a (Redis/Upstash).
 */

const loginAttempts = new Map<string, { count: number; resetAt: number }>();

const MAX_LOGIN_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minut

/**
 * Sprawdza czy dany klucz (IP lub username) nie przekroczył limitu prób logowania.
 * Zwraca `true` jeśli limit został przekroczony (rate limited).
 */
export function isLoginRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(key);

  if (!entry || now > entry.resetAt) {
    loginAttempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  entry.count++;
  if (entry.count > MAX_LOGIN_ATTEMPTS) {
    return true;
  }

  return false;
}

/**
 * Czyści wpisy rate limitu (np. po udanym logowaniu).
 */
export function clearLoginRateLimit(key: string): void {
  loginAttempts.delete(key);
}

/**
 * Zwraca informację o pozostałych próbach dla danego klucza.
 */
export function getLoginRateLimitRemaining(key: string): number {
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (!entry || now > entry.resetAt) return MAX_LOGIN_ATTEMPTS;
  return Math.max(0, MAX_LOGIN_ATTEMPTS - entry.count);
}

// Okresowe czyszczenie starych wpisów (co 5 minut)
if (typeof setInterval !== "undefined") {
  setInterval(
    () => {
      const now = Date.now();
      for (const [key, entry] of loginAttempts) {
        if (now > entry.resetAt) {
          loginAttempts.delete(key);
        }
      }
    },
    5 * 60 * 1000
  ).unref?.();
}
