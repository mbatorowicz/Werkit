import { jsonError, jsonOk, withApiErrorHandling } from "@/lib/apiRoute";
import { requireSuperadminSession } from "@/lib/apiPlatform";
import { parsePositiveIntFromString } from "@/lib/parseRouteParams";
import {
  clampAuditListLimit,
  isPlatformAuditAction,
  PlatformAuditService,
  type PlatformAuditAction,
} from "@/services/PlatformAuditService";

export const dynamic = "force-dynamic";

export const GET = withApiErrorHandling(
  async (request: Request) => {
    const auth = await requireSuperadminSession(request);
    if (!auth.ok) return auth.response;

    const url = new URL(request.url);
    const companyRaw = url.searchParams.get("companyId");
    const actionRaw = url.searchParams.get("action");
    const limitRaw = url.searchParams.get("limit");

    let companyId: number | undefined;
    if (companyRaw != null && companyRaw.trim() !== "") {
      const parsed = parsePositiveIntFromString(companyRaw);
      if (parsed == null) return jsonError("invalid_id", 400);
      companyId = parsed;
    }

    let action: PlatformAuditAction | undefined;
    if (actionRaw != null && actionRaw.trim() !== "") {
      if (!isPlatformAuditAction(actionRaw)) return jsonError("invalid_action", 400);
      action = actionRaw;
    }

    let limit: number | undefined;
    if (limitRaw != null && limitRaw.trim() !== "") {
      const n = Number.parseInt(limitRaw, 10);
      if (!Number.isFinite(n)) return jsonError("invalid_payload", 400);
      limit = clampAuditListLimit(n);
    }

    const events = await PlatformAuditService.list({ companyId, action, limit });
    return jsonOk({ events });
  },
  { defaultErrorCode: "fetch_error" }
);
