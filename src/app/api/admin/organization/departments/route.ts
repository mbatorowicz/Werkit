// ============================================================
// API: CRUD departamentów (admin)
// ============================================================

import { jsonError, jsonOk, parseJsonBody, withApiErrorHandling } from "@/lib/apiRoute";
import { requireCompanyScopedSession } from "@/lib/apiTenant";
import { OrganizationService } from "@/services/OrganizationService";

export const dynamic = "force-dynamic";

/** GET /api/admin/organization/departments — lista departamentów */
export const GET = withApiErrorHandling(
  async () => {
    const scoped = await requireCompanyScopedSession();
    if (!scoped.ok) return scoped.response;

    const departments = await OrganizationService.getDepartments(scoped.data.companyId);
    return jsonOk(departments);
  },
  { defaultErrorCode: "fetch_error" }
);

/** POST /api/admin/organization/departments — utwórz departament */
export const POST = withApiErrorHandling(
  async (request: Request) => {
    const scoped = await requireCompanyScopedSession();
    if (!scoped.ok) return scoped.response;

    const body = await parseJsonBody(request);
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) return jsonError("missing_name", 400);

    const parentId = body.parentId ? parseInt(String(body.parentId), 10) : null;
    const managerId = body.managerId ? parseInt(String(body.managerId), 10) : null;

    const inserted = await OrganizationService.createDepartment(scoped.data.companyId, {
      name,
      parentId: parentId && !Number.isNaN(parentId) ? parentId : null,
      managerId: managerId && !Number.isNaN(managerId) ? managerId : null,
    });

    return jsonOk(inserted, { status: 201 });
  },
  { defaultErrorCode: "save_error" }
);
