// ============================================================
// API: CRUD zespołów (admin)
// ============================================================

import { jsonError, jsonOk, parseJsonBody, withApiErrorHandling } from "@/lib/apiRoute";
import { requireCompanyScopedSession } from "@/lib/apiTenant";
import { OrganizationService } from "@/services/OrganizationService";

export const dynamic = 'force-dynamic';

/** GET /api/admin/organization/teams — lista zespołów (opcjonalnie ?departmentId=N) */
export const GET = withApiErrorHandling(async (request: Request) => {
  const scoped = await requireCompanyScopedSession();
  if (!scoped.ok) return scoped.response;

  const url = new URL(request.url);
  const departmentIdParam = url.searchParams.get("departmentId");

  if (departmentIdParam) {
    const departmentId = parseInt(departmentIdParam, 10);
    if (Number.isNaN(departmentId)) return jsonError("invalid_department_id", 400);
    const teams = await OrganizationService.getTeamsByDepartment(departmentId);
    return jsonOk(teams);
  }

  const teams = await OrganizationService.getTeams(scoped.data.companyId);
  return jsonOk(teams);
}, { defaultErrorCode: "fetch_error" });

/** POST /api/admin/organization/teams — utwórz zespół */
export const POST = withApiErrorHandling(async (request: Request) => {
  const scoped = await requireCompanyScopedSession();
  if (!scoped.ok) return scoped.response;

  const body = await parseJsonBody(request);
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return jsonError("missing_name", 400);

  const departmentId = parseInt(String(body.departmentId), 10);
  if (!departmentId || Number.isNaN(departmentId)) return jsonError("missing_department_id", 400);

  const leaderId = body.leaderId ? parseInt(String(body.leaderId), 10) : null;

  const inserted = await OrganizationService.createTeam(scoped.data.companyId, {
    departmentId,
    name,
    leaderId: leaderId && !Number.isNaN(leaderId) ? leaderId : null,
  });

  return jsonOk(inserted, { status: 201 });
}, { defaultErrorCode: "save_error" });
