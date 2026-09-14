import { cookies } from "next/headers";
import { jwtVerify, SignJWT, type JWTPayload } from "jose";
import { AUTH_TOKEN_COOKIE } from "@/lib/authCookie";
import { readImpersonatorUserId } from "@/lib/impersonationGuard";

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not defined in environment variables");
  }
  return new TextEncoder().encode(secret);
};

export const JWT_SECRET = getJwtSecret();

export interface JwtPayload {
  userId: number;
  role: string;
  /** NULL dla superadmina platformy. */
  companyId?: number | null;
  /** Superadmin prowadzący sesję wsparcia — tylko przy impersonacji. */
  impersonatorUserId?: number;
}

export function jwtPayloadFromVerified(p: JWTPayload): JwtPayload | null {
  const userId = Number(p.userId);
  if (!Number.isInteger(userId) || userId < 1) return null;
  const role = typeof p.role === "string" ? p.role : "";
  if (!role) return null;
  const companyId = p.companyId == null ? null : Number(p.companyId);
  const impersonatorUserId = readImpersonatorUserId(p);
  return {
    userId,
    role,
    companyId: companyId != null && Number.isInteger(companyId) ? companyId : null,
    ...(impersonatorUserId != null ? { impersonatorUserId } : {}),
  };
}

export async function parseAuthToken(token: string | undefined | null): Promise<JwtPayload | null> {
  if (!token) return null;
  try {
    const verified = await jwtVerify(token, JWT_SECRET);
    return jwtPayloadFromVerified(verified.payload);
  } catch {
    return null;
  }
}

export function readCookieFromHeader(
  cookieHeader: string | null,
  name: string
): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq);
    if (key !== name) continue;
    try {
      return decodeURIComponent(trimmed.slice(eq + 1));
    } catch {
      return trimmed.slice(eq + 1);
    }
  }
  return undefined;
}

export async function getAuthSessionFromRequest(req: Request): Promise<JwtPayload | null> {
  return parseAuthToken(readCookieFromHeader(req.headers.get("cookie"), AUTH_TOKEN_COOKIE));
}

export async function signSessionJwt(payload: JwtPayload, expiresIn: string): Promise<string> {
  const claims: Record<string, unknown> = {
    userId: payload.userId,
    role: payload.role,
    companyId: payload.companyId ?? null,
  };
  if (payload.impersonatorUserId != null) {
    claims.impersonatorUserId = payload.impersonatorUserId;
  }
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(JWT_SECRET);
}

/**
 * Parses and verifies the JWT token from cookies.
 * Returns the decoded payload if valid, null otherwise.
 */
export async function getAuthSession(): Promise<JwtPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_TOKEN_COOKIE)?.value;
  return parseAuthToken(token);
}

/**
 * Returns the userId from the current session or null if unauthenticated.
 */
export async function getUserId(): Promise<number | null> {
  const session = await getAuthSession();
  return session ? session.userId : null;
}

/**
 * Returns the user role from the current session or null if unauthenticated.
 */
export async function getUserRole(): Promise<string | null> {
  const session = await getAuthSession();
  return session ? session.role : null;
}
