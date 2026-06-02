import { jsonError, jsonOk, parseJsonBody, withApiErrorHandling } from "@/lib/apiRoute";
import { guardAdminMutation } from "@/lib/requireAdminMutation";
import { requireCompanyScopedSession } from "@/lib/apiTenant";
import { ResourceGroupService } from "@/services/dictionary/ResourceGroupService";

export const dynamic = "force-dynamic";

export const GET = withApiErrorHandling(
  async () => {
    const scoped = await requireCompanyScopedSession();
    if (!scoped.ok) return scoped.response;
    const groups = await ResourceGroupService.getGroups(scoped.data.companyId);
    return jsonOk(groups);
  },
  { defaultErrorCode: "fetch_error" }
);

export const POST = withApiErrorHandling(
  async (request: Request) => {
    const denied = await guardAdminMutation();
    if (denied) return denied;

    const scoped = await requireCompanyScopedSession();
    if (!scoped.ok) return scoped.response;

    const body = await parseJsonBody(request);
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) return jsonError("missing_name", 400);

    const id = await ResourceGroupService.addGroup(scoped.data.companyId, {
      name,
      description: typeof body.description === "string" ? body.description : null,
      sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : undefined,
    });
    return jsonOk({ id, success: true });
  },
  { defaultErrorCode: "save_error" }
);
