import { jsonError, jsonOk, parseJsonBody, parseJsonBodyOrEmpty, withApiErrorHandling } from "@/lib/apiRoute";
import { coordsFromRequestBody } from '@/lib/coordsFromRequestBody';
import { parsePositiveIntParam } from '@/lib/parseRouteParams';
import { WorkerSessionService } from '@/services/WorkerSessionService';
import { requireWorkerCompanySession } from '@/lib/apiTenant';

export const GET = withApiErrorHandling(async () => {
  const ctx = await requireWorkerCompanySession();
  if (!ctx.ok) return ctx.response;

  const sessionData = await WorkerSessionService.getActiveSessionWithDetails(
    ctx.userId,
    ctx.companyId,
  );
  return jsonOk(sessionData);
});

export const POST = withApiErrorHandling(async (request: Request) => {
  const ctx = await requireWorkerCompanySession();
  if (!ctx.ok) return ctx.response;

  const body = await parseJsonBody(request);
  const resourceId = body.resourceId;
  const categoryId = body.categoryId;
  const materialId = body.materialId;
  const customerId = body.customerId;
  const taskDescription = typeof body.taskDescription === "string" ? body.taskDescription : undefined;
  const quantityTons = typeof body.quantityTons === "string" ? body.quantityTons : null;
  const startCoord = coordsFromRequestBody(body);

  const resId = parsePositiveIntParam(resourceId);
  const catId = parsePositiveIntParam(categoryId);
  if (resId == null || catId == null) {
    return jsonError("missing_fields", 400);
  }

  const matId = materialId != null && materialId !== "" ? parsePositiveIntParam(materialId) : null;
  const custId = customerId != null && customerId !== "" ? parsePositiveIntParam(customerId) : null;
  if (materialId != null && materialId !== "" && matId == null) {
    return jsonError("invalid_payload", 400);
  }
  if (customerId != null && customerId !== "" && custId == null) {
    return jsonError("invalid_payload", 400);
  }

  const newSession = await WorkerSessionService.createWizardSession(ctx.userId, ctx.companyId, {
    resourceId: resId,
    categoryId: catId,
    materialId: matId,
    customerId: custId,
    quantityTons,
    taskDescription,
    startCoord,
  });

  return jsonOk({ success: true, session: newSession });
}, {
  mapUnknownError: (err) => {
    if (err instanceof Error && err.message === "session_active") return jsonError("session_active", 400);
    return null;
  },
  defaultErrorCode: "save_error",
});

export const PUT = withApiErrorHandling(async (request: Request) => {
  const ctx = await requireWorkerCompanySession();
  if (!ctx.ok) return ctx.response;

  const body = await parseJsonBodyOrEmpty(request);
  const endCoord = coordsFromRequestBody(body);

  await WorkerSessionService.endActiveSession(ctx.userId, ctx.companyId, endCoord);
  return jsonOk({ success: true });
}, {
  mapUnknownError: (err) => {
    if (err instanceof Error && err.message === "no_active_session") return jsonError("no_active_session", 400);
    return null;
  },
  defaultErrorCode: "save_error",
});
