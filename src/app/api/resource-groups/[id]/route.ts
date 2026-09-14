import { jsonError, jsonOk, parseJsonBody, withApiErrorHandling } from "@/lib/apiRoute";
import { guardAdminMutation } from "@/lib/requireAdminMutation";
import { requireCompanyScopedSession } from "@/lib/apiTenant";
import { ResourceGroupService } from "@/services/dictionary/ResourceGroupService";

export const dynamic = "force-dynamic";

export const GET = withApiErrorHandling(
  async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const scoped = await requireCompanyScopedSession();
    if (!scoped.ok) return scoped.response;

    const { id } = await params;
    const groupId = parseInt(id, 10);
    if (Number.isNaN(groupId)) return jsonError("invalid_id", 400);

    const group = await ResourceGroupService.getGroup(scoped.data.companyId, groupId);
    if (!group) return jsonError("not_found", 404);
    return jsonOk(group);
  },
  { defaultErrorCode: "fetch_error" }
);

export const PUT = withApiErrorHandling(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const denied = await guardAdminMutation();
    if (denied) return denied;

    const scoped = await requireCompanyScopedSession();
    if (!scoped.ok) return scoped.response;

    const { id } = await params;
    const groupId = parseInt(id, 10);
    if (Number.isNaN(groupId)) return jsonError("invalid_id", 400);

    const body = await parseJsonBody(request);
    await ResourceGroupService.updateGroup(scoped.data.companyId, groupId, {
      name: typeof body.name === "string" ? body.name : undefined,
      description:
        body.description !== undefined
          ? typeof body.description === "string"
            ? body.description
            : null
          : undefined,
      sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : undefined,
    });
    return jsonOk({ success: true });
  },
  { defaultErrorCode: "save_error" }
);

export const DELETE = withApiErrorHandling(
  async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const denied = await guardAdminMutation();
    if (denied) return denied;

    const scoped = await requireCompanyScopedSession();
    if (!scoped.ok) return scoped.response;

    const { id } = await params;
    const groupId = parseInt(id, 10);
    if (Number.isNaN(groupId)) return jsonError("invalid_id", 400);

    await ResourceGroupService.deleteGroup(scoped.data.companyId, groupId);
    return jsonOk({ success: true });
  },
  { defaultErrorCode: "delete_error" }
);
