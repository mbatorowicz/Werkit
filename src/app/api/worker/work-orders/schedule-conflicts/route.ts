import { jsonError, jsonOk, withApiErrorHandling } from "@/lib/apiRoute";
import { ScheduleConflictService } from "@/services/ScheduleConflictService";
import { requireWorkerCompanySession } from "@/lib/apiTenant";

export const dynamic = "force-dynamic";

export const GET = withApiErrorHandling(async (request: Request) => {
  const ctx = await requireWorkerCompanySession();
  if (!ctx.ok) return ctx.response;

  const { searchParams } = new URL(request.url);
  const userIdRaw = searchParams.get("userId");
  const resourceId = parseInt(searchParams.get("resourceId") ?? "", 10);
  const dueDateRaw = searchParams.get("dueDate");
  const durationRaw = searchParams.get("expectedDurationHours");
  const excludeOrderIdRaw = searchParams.get("excludeOrderId");

  const userId = userIdRaw != null && userIdRaw.trim() !== "" ? parseInt(userIdRaw, 10) : ctx.userId;
  if (userId !== ctx.userId) {
    return jsonError("Forbidden", 403);
  }

  if (Number.isNaN(resourceId)) {
    return jsonError("missing_fields", 400);
  }

  const dueDate = dueDateRaw ? new Date(dueDateRaw) : null;
  const durationHours =
    durationRaw != null && durationRaw.trim() !== "" ? parseFloat(durationRaw) : null;
  const excludeOrderId =
    excludeOrderIdRaw != null && excludeOrderIdRaw.trim() !== ""
      ? parseInt(excludeOrderIdRaw, 10)
      : undefined;

  if (!dueDate || durationHours == null || Number.isNaN(durationHours) || durationHours <= 0) {
    const resourceConflicts = await ScheduleConflictService.findResourceBusyConflictsSerialized(
      ctx.companyId,
      ctx.userId,
      resourceId,
    );
    return jsonOk({ conflicts: resourceConflicts });
  }

  const conflicts = await ScheduleConflictService.findConflictsForRequestSerialized(
    ctx.companyId,
    {
      userId: ctx.userId,
      resourceId,
      dueDate,
      durationHours,
      excludeOrderId: excludeOrderId != null && !Number.isNaN(excludeOrderId) ? excludeOrderId : undefined,
    },
  );

  return jsonOk({ conflicts });
}, { defaultErrorCode: "fetch_error" });
