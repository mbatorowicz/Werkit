import { getAuthSession, type JwtPayload } from "@/lib/auth";
import { jsonError } from "@/lib/apiRoute";
import { jwtFromLivePrincipal, requireLivePrincipalOr401 } from "@/lib/livePrincipal";
import { isSuperadminRole } from "@/lib/tenantRoles";
import { isLiveCompanyPrincipal } from "@/services/AuthPrincipalService";

export type CompanyScopedSession = {
  session: JwtPayload;
  companyId: number;
};

export async function requireWorkerCompanySession(): Promise<
  | { ok: true; userId: number; companyId: number; session: JwtPayload }
  | { ok: false; response: Response }
> {
  const session = await getAuthSession();
  const live = await requireLivePrincipalOr401(session);
  if (!live.ok) return live;

  if (live.principal.impersonatorUserId != null) {
    return { ok: false, response: jsonError("Forbidden", 403) };
  }

  if (isSuperadminRole(live.principal.role) || !isLiveCompanyPrincipal(live.principal)) {
    return { ok: false, response: jsonError("Forbidden", 403) };
  }

  return {
    ok: true,
    userId: live.principal.userId,
    companyId: live.principal.companyId,
    session: jwtFromLivePrincipal(live.principal),
  };
}

export async function requireCompanyScopedSession(): Promise<
  { ok: true; data: CompanyScopedSession } | { ok: false; response: Response }
> {
  const session = await getAuthSession();
  const live = await requireLivePrincipalOr401(session);
  if (!live.ok) return live;

  if (isSuperadminRole(live.principal.role) || !isLiveCompanyPrincipal(live.principal)) {
    return { ok: false, response: jsonError("Forbidden", 403) };
  }

  return {
    ok: true,
    data: {
      session: jwtFromLivePrincipal(live.principal),
      companyId: live.principal.companyId,
    },
  };
}

/** Odczyt panelu admina (admin + viewer). Worker odpada — m.in. magazyn materiałów. */
export async function requireAdminPanelSession(): Promise<
  { ok: true; data: CompanyScopedSession } | { ok: false; response: Response }
> {
  const scoped = await requireCompanyScopedSession();
  if (!scoped.ok) return scoped;
  const role = scoped.data.session.role;
  if (role !== "admin" && role !== "viewer") {
    return { ok: false, response: jsonError("Forbidden", 403) };
  }
  return scoped;
}
