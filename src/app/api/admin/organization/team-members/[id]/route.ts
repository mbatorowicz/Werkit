// ============================================================
// API: Pojedynczy członek zespołu (admin)
// ============================================================

import { jsonError, jsonOk, parseJsonBody, withApiErrorHandling } from "@/lib/apiRoute";
import { requireCompanyScopedSession } from "@/lib/apiTenant";
import { OrganizationService } from "@/services/OrganizationService";

export const dynamic = "force-dynamic";

/** PATCH /api/admin/organization/team-members/[id] — aktualizuj rolę członka */
export const PATCH = withApiErrorHandling(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const scoped = await requireCompanyScopedSession();
    if (!scoped.ok) return scoped.response;

    const { id } = await params;
    const memberId = parseInt(id, 10);
    if (Number.isNaN(memberId)) return jsonError("invalid_id", 400);

    const body = await parseJsonBody(request);
    const role = typeof body.role === "string" ? body.role : undefined;

    if (!role) return jsonError("missing_role", 400);

    const updated = await OrganizationService.updateTeamMember(memberId, { role });
    if (!updated) return jsonError("not_found", 404);

    return jsonOk(updated);
  },
  { defaultErrorCode: "save_error" }
);

/** DELETE /api/admin/organization/team-members/[id] — usuń członka z zespołu */
export const DELETE = withApiErrorHandling(
  async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const scoped = await requireCompanyScopedSession();
    if (!scoped.ok) return scoped.response;

    const { id } = await params;
    const memberId = parseInt(id, 10);
    if (Number.isNaN(memberId)) return jsonError("invalid_id", 400);

    const deleted = await OrganizationService.removeTeamMember(memberId);
    if (!deleted) return jsonError("not_found", 404);

    return jsonOk({ success: true });
  },
  { defaultErrorCode: "delete_error" }
);
