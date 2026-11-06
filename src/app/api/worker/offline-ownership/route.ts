import { jsonOk, jsonError, parseJson, withApiErrorHandling } from "@/lib/apiRoute";
import { requireWorkerCompanySession } from "@/lib/apiTenant";
import { GpsService } from "@/services/GpsService";

export const POST = withApiErrorHandling(async (request: Request) => {
  const ctx = await requireWorkerCompanySession();
  if (!ctx.ok) return ctx.response;
  const body = await parseJson(request);
  if (
    !Array.isArray(body) ||
    body.length > 200 ||
    body.some((id) => !Number.isInteger(id) || id < 1)
  )
    return jsonError("invalid_payload", 400);
  return jsonOk({
    owner: `${ctx.companyId}:${ctx.userId}`,
    sessionIds: await GpsService.ownedSessionIds(ctx.userId, ctx.companyId, body),
  });
});
