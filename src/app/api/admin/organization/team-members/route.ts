// ============================================================
// API: CRUD członków zespołu (admin)
// ============================================================

import { jsonError, jsonOk, parseJsonBody, withApiErrorHandling } from "@/lib/apiRoute";
import { requireCompanyScopedSession } from "@/lib/apiTenant";
import { OrganizationService } from "@/services/OrganizationService";

export const dynamic = "force-dynamic";

/** POST /api/admin/organization/team-members — dodaj członka do zespołu */
export const POST = withApiErrorHandling(
  async (request: Request) => {
    const scoped = await requireCompanyScopedSession();
    if (!scoped.ok) return scoped.response;

    const body = await parseJsonBody(request);
    const teamId = parseInt(String(body.teamId), 10);
    const userId = parseInt(String(body.userId), 10);

    if (!teamId || !userId || Number.isNaN(teamId) || Number.isNaN(userId)) {
      return jsonError("missing_fields", 400);
    }

    const role = typeof body.role === "string" ? body.role : "member";

    const inserted = await OrganizationService.addTeamMember({ teamId, userId, role });
    return jsonOk(inserted, { status: 201 });
  },
  { defaultErrorCode: "save_error" }
);
