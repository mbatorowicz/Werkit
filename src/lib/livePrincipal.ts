import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { jsonError } from "@/lib/apiRoute";
import { getAuthSession, type JwtPayload } from "@/lib/auth";
import { isSuperadminRole } from "@/lib/tenantRoles";
import {
  AuthPrincipalService,
  isLiveCompanyPrincipal,
  type LiveCompanyPrincipal,
  type LivePrincipal,
} from "@/services/AuthPrincipalService";

export type { LiveCompanyPrincipal, LivePrincipal };

/** JWT z rolą i firmą nadpisanymi z DB (źródło prawdy po `assertLivePrincipal`). */
export function jwtFromLivePrincipal(principal: LivePrincipal): JwtPayload {
  return {
    userId: principal.userId,
    role: principal.role,
    companyId: principal.companyId,
  };
}

export function clearAuthTokenCookie(response: NextResponse): void {
  response.cookies.set({
    name: "auth_token",
    value: "",
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
}

export function unauthorizedAndClearAuthToken(): NextResponse {
  const response = jsonError("Unauthorized", 401);
  clearAuthTokenCookie(response);
  return response;
}

/**
 * User istnieje, jest aktywny, firma (jeśli wymagana) też.
 * `null` = martwy principal — API ma zwrócić 401 i skasować cookie.
 */
export async function assertLivePrincipal(session: JwtPayload): Promise<LivePrincipal | null> {
  return AuthPrincipalService.resolve(session);
}

export async function requireLivePrincipalOr401(
  session: JwtPayload | null
): Promise<{ ok: true; principal: LivePrincipal } | { ok: false; response: NextResponse }> {
  if (!session?.userId) {
    return { ok: false, response: jsonError("Unauthorized", 401) };
  }
  const principal = await assertLivePrincipal(session);
  if (!principal) {
    return { ok: false, response: unauthorizedAndClearAuthToken() };
  }
  return { ok: true, principal };
}

/** Layout admin/worker: martwe konto → `/login?reason=session` (proxy kasuje cookie). */
export async function requireLiveCompanyPrincipalOrRedirect(): Promise<LiveCompanyPrincipal> {
  const session = await getAuthSession();
  if (!session?.userId) redirect("/login");

  const principal = await assertLivePrincipal(session);
  if (!principal) redirect("/login?reason=session");

  if (!isLiveCompanyPrincipal(principal) || isSuperadminRole(principal.role)) {
    redirect("/platform");
  }

  return principal;
}

/** Layout `/platform`: superadmin z DB, inaczej login + drop cookie (unik pętli JWT). */
export async function requireLiveSuperadminOrRedirect(): Promise<LivePrincipal> {
  const session = await getAuthSession();
  if (!session?.userId) redirect("/login");

  const principal = await assertLivePrincipal(session);
  if (!principal || !isSuperadminRole(principal.role)) {
    redirect("/login?reason=session");
  }

  return principal;
}
