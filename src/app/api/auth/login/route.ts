import { jsonError, jsonOk, parseJsonBody, withApiErrorHandling } from "@/lib/apiRoute";
import { SignJWT } from 'jose';

import { JWT_SECRET } from '@/lib/auth';
import { comparePassword } from '@/lib/passwordCrypto';

function isLikelyDatabaseOrInfraError(err: unknown): boolean {
  const msg = err instanceof Error ? `${err.name} ${err.message}` : String(err);
  return (
    /POSTGRES|postgres|Neon|connection|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|timeout|database/i.test(msg) ||
    /column .*does not exist|relation .*does not exist|failed query|socket|websocket|NeonDbError/i.test(
      msg,
    )
  );
}

export const POST = withApiErrorHandling(async (req: Request) => {
  const url = new URL(req.url);
  const forwardedProto = req.headers.get("x-forwarded-proto");
  const isHttps = forwardedProto === "https" || url.protocol === "https:";
  const cookieSameSite = (isHttps ? "none" : "lax") as "none" | "lax";

  const body = await parseJsonBody(req);
  const u = body.usernameEmail;
  const p = body.password;
  const usernameEmail = typeof u === "string" ? u.trim().toLowerCase() : "";
  const password = typeof p === "string" ? p : "";

  if (!usernameEmail || !password) {
    return jsonError("missing_credentials", 400);
  }

  const { AdminUserService } = await import("@/services/AdminUserService");
  const user = await AdminUserService.getUserByUsername(usernameEmail);

  if (!user) {
    return jsonError("invalid_credentials", 401);
  }

  if (!user.isActive) {
    return jsonError("account_blocked", 403);
  }

  let isPasswordValid = false;
  try {
    isPasswordValid = await comparePassword(password, user.passwordHash);
  } catch {
    return jsonError("invalid_credentials", 401);
  }

  if (!isPasswordValid) {
    return jsonError("invalid_credentials", 401);
  }

  const jwt = await new SignJWT({
    userId: user.id,
    role: user.role,
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
    name: "auth_token",
    value: jwt,
    httpOnly: true,
    secure: isHttps,
    sameSite: cookieSameSite,
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  return response;
}, {
  mapUnknownError: (err) => (isLikelyDatabaseOrInfraError(err) ? jsonError("service_unavailable", 503) : null),
  defaultErrorCode: "server_error",
});
