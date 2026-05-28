// ============================================================
// API: Pojedynczy departament (admin)
// ============================================================

import { jsonError, jsonOk, parseJsonBody, withApiErrorHandling } from "@/lib/apiRoute";
import { requireCompanyScopedSession } from "@/lib/apiTenant";
import { OrganizationService } from "@/services/OrganizationService";

export const dynamic = 'force-dynamic';

/** GET /api/admin/organization/departments/[id] — szczegóły departamentu */
export const GET = withApiErrorHandling(async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const scoped = await requireCompanyScopedSession();
  if (!scoped.ok) return scoped.response;

  const { id } = await params;
  const deptId = parseInt(id, 10);
  if (Number.isNaN(deptId)) return jsonError("invalid_id", 400);

  const dept = await OrganizationService.getDepartment(scoped.data.companyId, deptId);
  if (!dept) return jsonError("not_found", 404);

  return jsonOk(dept);
}, { defaultErrorCode: "fetch_error" });

/** PATCH /api/admin/organization/departments/[id] — aktualizuj departament */
export const PATCH = withApiErrorHandling(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const scoped = await requireCompanyScopedSession();
  if (!scoped.ok) return scoped.response;

  const { id } = await params;
  const deptId = parseInt(id, 10);
  if (Number.isNaN(deptId)) return jsonError("invalid_id", 400);

  const body = await parseJsonBody(request);
  const name = typeof body.name === "string" ? body.name.trim() : undefined;
  const parentId = body.parentId !== undefined
    ? (body.parentId ? parseInt(String(body.parentId), 10) : null)
    : undefined;
  const managerId = body.managerId !== undefined
    ? (body.managerId ? parseInt(String(body.managerId), 10) : null)
    : undefined;

  const updated = await OrganizationService.updateDepartment(deptId, {
    name,
    parentId,
    managerId,
  });

  if (!updated) return jsonError("not_found", 404);
  return jsonOk(updated);
}, { defaultErrorCode: "save_error" });

/** DELETE /api/admin/organization/departments/[id] — usuń departament */
export const DELETE = withApiErrorHandling(async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const scoped = await requireCompanyScopedSession();
  if (!scoped.ok) return scoped.response;

  const { id } = await params;
  const deptId = parseInt(id, 10);
  if (Number.isNaN(deptId)) return jsonError("invalid_id", 400);

  const deleted = await OrganizationService.deleteDepartment(deptId);
  if (!deleted) return jsonError("not_found", 404);

  return jsonOk({ success: true });
}, { defaultErrorCode: "delete_error" });
