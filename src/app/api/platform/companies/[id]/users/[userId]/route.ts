import { jsonError, jsonOk, parseJsonBody, withApiErrorHandling } from "@/lib/apiRoute";
import { requireSuperadminSession } from "@/lib/apiPlatform";
import { PlatformCompanyService } from "@/services/PlatformCompanyService";
import { PlatformAuditService } from "@/services/PlatformAuditService";
import { PlatformTenantUserService } from "@/services/PlatformTenantUserService";
import { parsePositiveIntFromString } from "@/lib/parseRouteParams";

export const dynamic = "force-dynamic";

/** Aktywacja / dezaktywacja admina lub viewera firmy. */
export const PATCH = withApiErrorHandling(
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
    if (typeof body.isActive !== "boolean") return jsonError("invalid_payload", 400);

    try {
      const updated = await PlatformTenantUserService.setUserActive(
        companyId,
        userId,
        body.isActive,
        auth.userId
      );
      await PlatformAuditService.insert({
        actorUserId: auth.userId,
        companyId,
        action: updated.isActive ? "admin.activate" : "admin.deactivate",
        targetType: "user",
        targetId: userId,
        metadata: { role: updated.role, isActive: updated.isActive },
      });
      return jsonOk({ success: true, user: updated });
    } catch (e: unknown) {
      const code = e instanceof Error ? e.message : "";
      if (code === "not_found") return jsonError("not_found", 404);
      if (code === "last_admin") return jsonError("last_admin", 409);
      throw e;
    }
  },
  { defaultErrorCode: "save_error" }
);
