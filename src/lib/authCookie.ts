import type { NextResponse } from "next/server";

/** Nazwa cookie sesji JWT — jedyne miejsce, z którego korzystają login / logout / proxy. */
export const AUTH_TOKEN_COOKIE = "auth_token";

export const AUTH_TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export type AuthCookieSameSite = "none" | "lax";

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
  return {
    name: AUTH_TOKEN_COOKIE,
    httpOnly: true,
    path: "/",
    secure: isHttps,
    sameSite: isHttps ? "none" : "lax",
  };
}

function serializeAuthTokenClear(isHttps: boolean): string {
  const parts = [
    `${AUTH_TOKEN_COOKIE}=`,
    "Path=/",
    "Max-Age=0",
    "HttpOnly",
    `SameSite=${isHttps ? "None" : "Lax"}`,
  ];
  if (isHttps) parts.push("Secure");
  return parts.join("; ");
}

/**
 * Kasuje `auth_token` tymi samymi Path/Secure/SameSite co `cookies.set` przy logowaniu.
 * Bez tego WebView zostawia sesję (`cookies.delete` bez atrybutów ≠ ten sam cookie).
 *
 * Domyślnie oba warianty (HTTP Lax + HTTPS None/Secure) — Edge/401 nie zawsze zna schemat.
 * Gdy `isHttps` jest znany (logout z Request), tylko pasujący wariant.
 */
export function clearAuthTokenCookie(response: NextResponse, isHttps?: boolean): void {
  const variants = isHttps === undefined ? [false, true] : [isHttps];
  for (const https of variants) {
    response.headers.append("Set-Cookie", serializeAuthTokenClear(https));
  }
}
