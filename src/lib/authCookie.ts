import type { NextResponse } from "next/server";

/** Nazwa cookie sesji JWT — jedyne miejsce, z którego korzystają login / logout / proxy. */
export const AUTH_TOKEN_COOKIE = "auth_token";

/** Kopia JWT superadmina na czas impersonacji (PL1). */
export const PLATFORM_RESUME_COOKIE = "platform_resume";

export const AUTH_TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

/** TTL cookie `auth_token` podczas impersonacji — 30 min, zgodnie z `exp` JWT. */
export const IMPERSONATION_TOKEN_MAX_AGE_SECONDS = 60 * 30;

export type AuthCookieSameSite = "none" | "lax";

export type SessionCookieName = typeof AUTH_TOKEN_COOKIE | typeof PLATFORM_RESUME_COOKIE;

/** HTTPS z `x-forwarded-proto` (Vercel) albo ze schematu URL (lokalny https). */
export function isHttpsRequest(req: Request): boolean {
  const forwardedProto = req.headers.get("x-forwarded-proto");
  if (forwardedProto === "https") return true;
  try {
    return new URL(req.url).protocol === "https:";
  } catch {
    return false;
  }
}

export function sessionCookieAttrs<N extends SessionCookieName>(
  name: N,
  isHttps: boolean
): {
  name: N;
  httpOnly: true;
  path: "/";
  secure: boolean;
  sameSite: AuthCookieSameSite;
} {
  return {
    name,
    httpOnly: true,
    path: "/",
    secure: isHttps,
    sameSite: isHttps ? "none" : "lax",
  };
}

/**
 * Atrybuty cookie jak przy logowaniu: Path=/; HttpOnly; na HTTPS SameSite=None+Secure
 * (Capacitor WebView na innym originie). Lokalnie HTTP: SameSite=Lax, bez Secure.
 */
export function authTokenCookieAttrs(isHttps: boolean): {
  name: typeof AUTH_TOKEN_COOKIE;
  httpOnly: true;
  path: "/";
  secure: boolean;
  sameSite: AuthCookieSameSite;
} {
  return sessionCookieAttrs(AUTH_TOKEN_COOKIE, isHttps);
}

export function platformResumeCookieAttrs(isHttps: boolean): {
  name: typeof PLATFORM_RESUME_COOKIE;
  httpOnly: true;
  path: "/";
  secure: boolean;
  sameSite: AuthCookieSameSite;
} {
  return sessionCookieAttrs(PLATFORM_RESUME_COOKIE, isHttps);
}

function serializeNamedCookieClear(name: string, isHttps: boolean): string {
  const parts = [
    `${name}=`,
    "Path=/",
    "Max-Age=0",
    "HttpOnly",
    `SameSite=${isHttps ? "None" : "Lax"}`,
  ];
  if (isHttps) parts.push("Secure");
  return parts.join("; ");
}

function clearNamedCookie(response: NextResponse, name: string, isHttps?: boolean): void {
  const variants = isHttps === undefined ? [false, true] : [isHttps];
  for (const https of variants) {
    response.headers.append("Set-Cookie", serializeNamedCookieClear(name, https));
  }
}

/**
 * Kasuje `auth_token` tymi samymi Path/Secure/SameSite co `cookies.set` przy logowaniu.
 * Bez tego WebView zostawia sesję (`cookies.delete` bez atrybutów ≠ ten sam cookie).
 *
 * Domyślnie oba warianty (HTTP Lax + HTTPS None/Secure) — Edge/401 nie zawsze zna schemat.
 * Gdy `isHttps` jest znany (logout z Request), tylko pasujący wariant.
 */
export function clearAuthTokenCookie(response: NextResponse, isHttps?: boolean): void {
  clearNamedCookie(response, AUTH_TOKEN_COOKIE, isHttps);
}

export function clearPlatformResumeCookie(response: NextResponse, isHttps?: boolean): void {
  clearNamedCookie(response, PLATFORM_RESUME_COOKIE, isHttps);
}
