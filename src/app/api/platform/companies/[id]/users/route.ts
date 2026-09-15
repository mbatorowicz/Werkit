import { jsonError, jsonOk, withApiErrorHandling } from "@/lib/apiRoute";
import { requireSuperadminSession } from "@/lib/apiPlatform";
import { PlatformCompanyService } from "@/services/PlatformCompanyService";
import { PlatformTenantUserService } from "@/services/PlatformTenantUserService";
import { parsePositiveIntFromString } from "@/lib/parseRouteParams";

export const dynamic = "force-dynamic";

/** Lista adminów i viewerów firmy — bez passwordHash. */
export const GET = withApiErrorHandling(
  async (request: Request, context: { params: Promise<{ id: string }> }) => {
    const auth = await requireSuperadminSession(request);
    if (!auth.ok) return auth.response;

    const companyId = parsePositiveIntFromString((await context.params).id);
    if (companyId === null) return jsonError("invalid_id", 400);

    const company = await PlatformCompanyService.getCompanyById(companyId);
    if (!company) return jsonError("not_found", 404);

    const users = await PlatformTenantUserService.listCompanyUsers(companyId);
    return jsonOk({ users });
  },
  { defaultErrorCode: "fetch_error" }
);
