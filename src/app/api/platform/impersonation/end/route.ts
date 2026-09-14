import { decodeJwt } from "jose";
import { jsonError, jsonOk, withApiErrorHandling } from "@/lib/apiRoute";
import { parseAuthToken, readCookieFromHeader } from "@/lib/auth";
import {
  AUTH_TOKEN_COOKIE,
  AUTH_TOKEN_MAX_AGE_SECONDS,
  PLATFORM_RESUME_COOKIE,
  authTokenCookieAttrs,
  clearPlatformResumeCookie,
  isHttpsRequest,
} from "@/lib/authCookie";
import { isSuperadminRole } from "@/lib/tenantRoles";
import { AuthPrincipalService } from "@/services/AuthPrincipalService";
import { PlatformAuditService } from "@/services/PlatformAuditService";

export const dynamic = "force-dynamic";

/** Przywraca JWT superadmina z `platform_resume`. Działa też po wygaśnięciu support JWT. */
export const POST = withApiErrorHandling(
  async (request: Request) => {
    const resume = readCookieFromHeader(request.headers.get("cookie"), PLATFORM_RESUME_COOKIE);
    if (!resume) return jsonError("no_resume", 400);

    const resumeSession = await parseAuthToken(resume);
    if (!resumeSession?.userId) return jsonError("Unauthorized", 401);

    const resumePrincipal = await AuthPrincipalService.resolve(resumeSession);
    if (!resumePrincipal || !isSuperadminRole(resumePrincipal.role)) {
      return jsonError("Unauthorized", 401);
    }

    const expiredSupport = readCookieFromHeader(request.headers.get("cookie"), AUTH_TOKEN_COOKIE);
    let targetUserId: number | null = null;
    let companyId: number | null = null;
    if (expiredSupport) {
      try {
        const decoded = decodeJwt(expiredSupport);
        const uid = Number(decoded.userId);
        const cid = decoded.companyId == null ? null : Number(decoded.companyId);
        if (Number.isInteger(uid) && uid >= 1) targetUserId = uid;
        if (cid != null && Number.isInteger(cid) && cid >= 1) companyId = cid;
      } catch {
        // metadata audytu jest opcjonalna
      }
    }

    await PlatformAuditService.insert({
      actorUserId: resumePrincipal.userId,
      companyId,
      action: "impersonation.end",
      targetType: "impersonation",
      targetId: targetUserId,
    });

    const isHttps = isHttpsRequest(request);
    const response = jsonOk({ success: true });
    response.cookies.set({
      ...authTokenCookieAttrs(isHttps),
      value: resume,
      maxAge: AUTH_TOKEN_MAX_AGE_SECONDS,
    });
    clearPlatformResumeCookie(response, isHttps);
    return response;
  },
  { defaultErrorCode: "save_error" }
);
