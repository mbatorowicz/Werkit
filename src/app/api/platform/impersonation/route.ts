import { jsonError, jsonOk, parseJsonBody, withApiErrorHandling } from "@/lib/apiRoute";
import { getAuthSessionFromRequest, readCookieFromHeader, signSessionJwt } from "@/lib/auth";
import {
  AUTH_TOKEN_COOKIE,
  IMPERSONATION_TOKEN_MAX_AGE_SECONDS,
  authTokenCookieAttrs,
  isHttpsRequest,
  platformResumeCookieAttrs,
} from "@/lib/authCookie";
import {
  IMPERSONATION_JWT_EXPIRES_IN,
  normalizeImpersonationReason,
} from "@/lib/impersonationGuard";
import { unauthorizedAndClearAuthToken } from "@/lib/livePrincipal";
import { parsePositiveIntParam } from "@/lib/parseRouteParams";
import { isSuperadminRole } from "@/lib/tenantRoles";
import { AuthPrincipalService } from "@/services/AuthPrincipalService";
import { PlatformAuditService } from "@/services/PlatformAuditService";
import {
  PlatformImpersonationError,
  PlatformImpersonationService,
} from "@/services/PlatformImpersonationService";

export const dynamic = "force-dynamic";

async function requireLiveSuperadminFromRequest(req: Request) {
  const session = await getAuthSessionFromRequest(req);
  if (!session?.userId) return { ok: false as const, response: jsonError("Unauthorized", 401) };
  if (session.impersonatorUserId != null) {
    return { ok: false as const, response: jsonError("already_impersonating", 409) };
  }
  const principal = await AuthPrincipalService.resolve(session);
  if (!principal) return { ok: false as const, response: unauthorizedAndClearAuthToken() };
  if (!isSuperadminRole(principal.role)) {
    return { ok: false as const, response: jsonError("Forbidden", 403) };
  }
  return { ok: true as const, principal, session };
}

/** Status sesji wsparcia — superadmin (nieaktywna) albo impersonacja (aktywna). */
export const GET = withApiErrorHandling(
  async (request: Request) => {
    const session = await getAuthSessionFromRequest(request);
    if (!session?.userId) return jsonError("Unauthorized", 401);

    if (session.impersonatorUserId != null) {
      const principal = await AuthPrincipalService.resolve(session);
      if (!principal || principal.impersonatorUserId == null || principal.companyId == null) {
        return unauthorizedAndClearAuthToken();
      }
      const { PlatformCompanyService } = await import("@/services/PlatformCompanyService");
      const company = await PlatformCompanyService.getCompanyById(principal.companyId);
      return jsonOk({
        active: true,
        companyId: principal.companyId,
        companyName: company?.name ?? "",
        targetUserId: principal.userId,
        targetFullName: principal.fullName,
        targetRole: principal.role,
        impersonatorUserId: principal.impersonatorUserId,
      });
    }

    const principal = await AuthPrincipalService.resolve(session);
    if (!principal) return unauthorizedAndClearAuthToken();
    if (!isSuperadminRole(principal.role)) return jsonError("Forbidden", 403);
    return jsonOk({ active: false });
  },
  { defaultErrorCode: "fetch_error" }
);

/** Start impersonacji: kopia `auth_token` → `platform_resume` (TTL 30 min, jak support JWT). */
export const POST = withApiErrorHandling(
  async (request: Request) => {
    const auth = await requireLiveSuperadminFromRequest(request);
    if (!auth.ok) return auth.response;

    const currentToken = readCookieFromHeader(request.headers.get("cookie"), AUTH_TOKEN_COOKIE);
    if (!currentToken) return jsonError("Unauthorized", 401);

    const body = await parseJsonBody(request);
    const companyId = parsePositiveIntParam(body.companyId);
    const targetUserId = parsePositiveIntParam(body.targetUserId);
    if (companyId == null || targetUserId == null) return jsonError("invalid_payload", 400);
    const reason = normalizeImpersonationReason(body.reason);

    try {
      const started = await PlatformImpersonationService.resolveStartTarget(
        companyId,
        targetUserId
      );
      const jwt = await signSessionJwt(
        {
          userId: started.target.id,
          role: started.target.role,
          companyId,
          impersonatorUserId: auth.principal.userId,
        },
        IMPERSONATION_JWT_EXPIRES_IN
      );

      await PlatformAuditService.insert({
        actorUserId: auth.principal.userId,
        companyId,
        action: "impersonation.start",
        targetType: "impersonation",
        targetId: started.target.id,
        metadata: {
          targetUserId: started.target.id,
          targetRole: started.target.role,
          ...(reason ? { reason } : {}),
        },
      });

      const isHttps = isHttpsRequest(request);
      const response = jsonOk({
        success: true,
        target: {
          userId: started.target.id,
          role: started.target.role,
          fullName: started.target.fullName,
        },
      });
      response.cookies.set({
        ...platformResumeCookieAttrs(isHttps),
        value: currentToken,
        maxAge: IMPERSONATION_TOKEN_MAX_AGE_SECONDS,
      });
      response.cookies.set({
        ...authTokenCookieAttrs(isHttps),
        value: jwt,
        maxAge: IMPERSONATION_TOKEN_MAX_AGE_SECONDS,
      });
      return response;
    } catch (e: unknown) {
      const code = e instanceof PlatformImpersonationError ? e.message : "";
      if (code === "not_found") return jsonError("not_found", 404);
      if (code === "company_inactive") return jsonError("company_inactive", 403);
      if (code === "user_inactive") return jsonError("user_inactive", 403);
      throw e;
    }
  },
  { defaultErrorCode: "save_error" }
);
