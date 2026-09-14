import { jsonError, jsonOk, parseJsonBody, withApiErrorHandling } from "@/lib/apiRoute";
import { SignJWT } from "jose";

import { JWT_SECRET } from "@/lib/auth";
import { comparePassword, DUMMY_BCRYPT_HASH } from "@/lib/passwordCrypto";
import { AUTH_TOKEN_MAX_AGE_SECONDS, authTokenCookieAttrs, isHttpsRequest } from "@/lib/authCookie";
import { clearLoginRateLimit, isLoginRateLimited, recordLoginFailure } from "@/lib/serverRateLimit";

function isLikelyDatabaseOrInfraError(err: unknown): boolean {
  const msg = err instanceof Error ? `${err.name} ${err.message}` : String(err);
  return (
    /POSTGRES|postgres|Neon|connection|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|timeout|database/i.test(
      msg
    ) || /relation .*does not exist|failed query|socket|websocket|NeonDbError/i.test(msg)
  );
}

/**
 * Jeden wynik porażki (null) dla: brak usera, złe hasło, nieaktywny user, nieaktywna firma.
 * Ghost user i tak przechodzi przez compare z dummy hashem (timing).
 */
async function authenticateLoginCredentials(usernameEmail: string, password: string) {
  const { AdminUserService } = await import("@/services/AdminUserService");
  const user = await AdminUserService.getUserByUsername(usernameEmail);
  const hashToCompare = user?.passwordHash ?? DUMMY_BCRYPT_HASH;

  let isPasswordValid = false;
  try {
    isPasswordValid = await comparePassword(password, hashToCompare);
  } catch {
    isPasswordValid = false;
  }

  if (!user || !user.isActive || !isPasswordValid) return null;

  if (user.companyId != null) {
    const { PlatformCompanyService } = await import("@/services/PlatformCompanyService");
    const company = await PlatformCompanyService.getCompanyById(user.companyId);
    if (!company?.isActive) return null;
  }

  return user;
}

export const POST = withApiErrorHandling(
  async (req: Request) => {
    const isHttps = isHttpsRequest(req);

    // Na Vercel pierwszy hop XFF jest wiarygodny; poza Vercel nagłówek jest spoofowalny
    // (throttle, nie autoryzacja). Zob. komentarz w serverRateLimit.ts.
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const body = await parseJsonBody(req);
    const u = body.usernameEmail;
    const p = body.password;
    const usernameEmail = typeof u === "string" ? u.trim().toLowerCase() : "";
    const password = typeof p === "string" ? p : "";

    const rateLimitKey = `${clientIp}:${usernameEmail || "anon"}`;
    if (await isLoginRateLimited(rateLimitKey)) {
      return jsonError("too_many_attempts", 429);
    }

    if (!usernameEmail || !password) {
      return jsonError("missing_credentials", 400);
    }

    const user = await authenticateLoginCredentials(usernameEmail, password);
    if (!user) {
      await recordLoginFailure(rateLimitKey);
      return jsonError("invalid_credentials", 401);
    }

    const { AdminUserService } = await import("@/services/AdminUserService");
    await clearLoginRateLimit(rateLimitKey);
    await AdminUserService.touchLastLogin(user.id);

    const jwt = await new SignJWT({
      userId: user.id,
      role: user.role,
      companyId: user.companyId ?? null,
      username: user.usernameEmail,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(JWT_SECRET);

    const response = jsonOk({
      success: true,
      user: { id: user.id, fullName: user.fullName, role: user.role },
    });

    response.cookies.set({
      ...authTokenCookieAttrs(isHttps),
      value: jwt,
      maxAge: AUTH_TOKEN_MAX_AGE_SECONDS,
    });

    return response;
  },
  {
    mapUnknownError: (err) => {
      const e = err instanceof Error ? err : new Error(String(err));
      // Drizzle może opakować błąd połączenia w cause
      const cause =
        e instanceof Error && "cause" in e ? (e as Error & { cause?: unknown }).cause : undefined;
      const checkErr = cause instanceof Error ? cause : e;
      return isLikelyDatabaseOrInfraError(checkErr) ? jsonError("service_unavailable", 503) : null;
    },
    defaultErrorCode: "server_error",
  }
);
