import { jsonError, jsonOk, parseJsonBody, withApiErrorHandling } from "@/lib/apiRoute";
import { requireSuperadminSession } from "@/lib/apiPlatform";
import { hashPassword } from "@/lib/passwordCrypto";
import { isPasswordPolicyOk } from "@/lib/passwordPolicy";
import { parsePositiveIntFromString } from "@/lib/parseRouteParams";
import { PlatformAuditService } from "@/services/PlatformAuditService";
import { PlatformCompanyService } from "@/services/PlatformCompanyService";
import { PlatformTenantUserService } from "@/services/PlatformTenantUserService";

export const dynamic = "force-dynamic";

/** Reset hasła admina/viewera firmy. Hasło nie wraca w odpowiedzi i nie idzie do audytu. */
export const POST = withApiErrorHandling(
  async (request: Request, context: { params: Promise<{ id: string; userId: string }> }) => {
    const auth = await requireSuperadminSession(request);
    if (!auth.ok) return auth.response;

    const params = await context.params;
    const companyId = parsePositiveIntFromString(params.id);
    const userId = parsePositiveIntFromString(params.userId);
    if (companyId === null || userId === null) return jsonError("invalid_id", 400);

    const company = await PlatformCompanyService.getCompanyById(companyId);
    if (!company) return jsonError("not_found", 404);

    const body = await parseJsonBody(request);
    const password = typeof body.password === "string" ? body.password : "";
    if (!password.trim()) return jsonError("missing_fields", 400);

    const target = await PlatformTenantUserService.getStaffUser(companyId, userId);
    if (!target) return jsonError("not_found", 404);

    if (!isPasswordPolicyOk(password, target.usernameEmail)) {
      return jsonError("weak_password", 400);
    }

    const passwordHash = await hashPassword(password, 10);
    await PlatformTenantUserService.resetPassword(companyId, userId, passwordHash, auth.userId);
    await PlatformAuditService.insert({
      actorUserId: auth.userId,
      companyId,
      action: "admin.reset_password",
      targetType: "user",
      targetId: userId,
    });
    return jsonOk({ success: true });
  },
  { defaultErrorCode: "save_error" }
);
