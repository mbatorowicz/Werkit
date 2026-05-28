// ============================================================
// API: Pojedynczy zespół (admin)
// ============================================================

import { jsonError, jsonOk, parseJsonBody, withApiErrorHandling } from "@/lib/apiRoute";
import { requireCompanyScopedSession } from "@/lib/apiTenant";
import { OrganizationService } from "@/services/OrganizationService";

export const dynamic = 'force-dynamic';

/** GET /api/admin/organization/teams/[id] — szczegóły zespołu z członkami */
export const GET = withApiErrorHandling(async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const scoped = await requireCompanyScopedSession();
  if (!scoped.ok) return scoped.response;

  const { id } = await params;
  const teamId = parseInt(id, 10);
  if (Number.isNaN(teamId)) return jsonError("invalid_id", 400);

  const team = await OrganizationService.getTeam(teamId);
  if (!team) return jsonError("not_found", 404);

  const members = await OrganizationService.getTeamMembersWithUsers(teamId);

  return jsonOk({ ...team, members });
}, { defaultErrorCode: "fetch_error" });

/** PATCH /api/admin/organization/teams/[id] — aktualizuj zespół */
export const PATCH = withApiErrorHandling(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const scoped = await requireCompanyScopedSession();
  if (!scoped.ok) return scoped.response;

  const { id } = await params;
  const teamId = parseInt(id, 10);
  if (Number.isNaN(teamId)) return jsonError("invalid_id", 400);

  const body = await parseJsonBody(request);
  const name = typeof body.name === "string" ? body.name.trim() : undefined;
  const leaderId = body.leaderId !== undefined
    ? (body.leaderId ? parseInt(String(body.leaderId), 10) : null)
    : undefined;

  const updated = await OrganizationService.updateTeam(teamId, { name, leaderId });
  if (!updated) return jsonError("not_found", 404);

  return jsonOk(updated);
}, { defaultErrorCode: "save_error" });

/** DELETE /api/admin/organization/teams/[id] — usuń zespół */
export const DELETE = withApiErrorHandling(async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const scoped = await requireCompanyScopedSession();
  if (!scoped.ok) return scoped.response;

  const { id } = await params;
  const teamId = parseInt(id, 10);
  if (Number.isNaN(teamId)) return jsonError("invalid_id", 400);

  const deleted = await OrganizationService.deleteTeam(teamId);
  if (!deleted) return jsonError("not_found", 404);

  return jsonOk({ success: true });
}, { defaultErrorCode: "delete_error" });
