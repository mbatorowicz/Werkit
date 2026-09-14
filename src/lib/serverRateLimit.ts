/**
 * Limit logowań — cienki wrapper nad `LoginRateLimitService` (tabela `login_attempts`).
 * RAM `Map` nie jest źródłem prawdy (cold start Vercel zerowałby licznik).
 *
 * Klucz budowany w login route: pierwszy hop `x-forwarded-for` + znormalizowany login.
 * Na Vercel pierwszy hop jest wiarygodny. Poza Vercel nagłówek jest spoofowalny —
 * nie budować na nim autoryzacji (tylko throttle brute-force).
 */
export {
  clearLoginRateLimit,
  isLoginRateLimited,
  MAX_LOGIN_ATTEMPTS,
  LOGIN_WINDOW_MS,
  recordLoginFailure,
} from "@/services/LoginRateLimitService";
