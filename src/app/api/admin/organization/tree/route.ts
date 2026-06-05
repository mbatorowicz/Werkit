import { jsonOk, withApiErrorHandling } from "@/lib/apiRoute";
import { requireCompanyScopedSession } from "@/lib/apiTenant";
import { OrganizationService } from "@/services/OrganizationService";

export const dynamic = "force-dynamic";

export const GET = withApiErrorHandling(
  async () => {
    const scoped = await requireCompanyScopedSession();
    if (!scoped.ok) return scoped.response;
    const { companyId } = scoped.data;

    const [tree, unassignedUsers] = await Promise.all([
      OrganizationService.getDepartmentTree(companyId),
      OrganizationService.getUnassignedWorkers(companyId),
    ]);

    return jsonOk({ tree, unassignedUsers });
  },
  { defaultErrorCode: "fetch_error" }
);
