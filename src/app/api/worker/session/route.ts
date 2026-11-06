import { mapSessionDomainError } from "@/lib/sessionDomainErrors";
import {
  jsonError,
  jsonOk,
  parseJsonBody,
  parseJsonBodyOrEmpty,
  withApiErrorHandling,
} from "@/lib/apiRoute";
import { MaterialStockMovementError } from "@/services/materials/MaterialStockMovementError";
import { WorkerSessionService } from "@/services/WorkerSessionService";
import { requireWorkerCompanySession } from "@/lib/apiTenant";
import { coordsFromRequestBody } from "@/lib/coordsFromRequestBody";

export const GET = withApiErrorHandling(async () => {
  const ctx = await requireWorkerCompanySession();
  if (!ctx.ok) return ctx.response;

  const sessionData = await WorkerSessionService.getActiveSessionWithDetails(
    ctx.userId,
    ctx.companyId
  );
  return jsonOk(sessionData);
});

export const POST = withApiErrorHandling(
  async (request: Request) => {
    const ctx = await requireWorkerCompanySession();
    if (!ctx.ok) return ctx.response;

    const body = await parseJsonBody(request);
    const newSession = await WorkerSessionService.createWizardSession(
      ctx.userId,
      ctx.companyId,
      body
    );

    return jsonOk({ success: true, session: newSession });
  },
  {
    mapUnknownError: (err) => {
      const domainError = mapSessionDomainError(err);
      if (domainError) return domainError;
      if (err instanceof Error && err.message === "session_active")
        return jsonError("session_active", 400);
      if (err instanceof Error && err.message === "resource_busy")
        return jsonError("resource_busy", 409);
      if (err instanceof MaterialStockMovementError) return jsonError(err.code, 400);
      return null;
    },
    defaultErrorCode: "save_error",
  }
);

export const PUT = withApiErrorHandling(
  async (request: Request) => {
    const ctx = await requireWorkerCompanySession();
    if (!ctx.ok) return ctx.response;

    const body = await parseJsonBodyOrEmpty(request);
    if (!Number.isSafeInteger(body.sessionId) || Number(body.sessionId) < 1)
      return jsonError("invalid_payload", 400);
    const endCoord = coordsFromRequestBody(body);

    await WorkerSessionService.endActiveSession(
      ctx.userId,
      ctx.companyId,
      endCoord,
      typeof body.sessionId === "number" ? body.sessionId : undefined,
      typeof body.occurredAt === "string" ? body.occurredAt : undefined
    );
    return jsonOk({ success: true });
  },
  {
    mapUnknownError: (err) => {
      const domainError = mapSessionDomainError(err);
      if (domainError) return domainError;
      if (err instanceof Error && err.message === "no_active_session")
        return jsonError("no_active_session", 400);
      return null;
    },
    defaultErrorCode: "save_error",
  }
);
