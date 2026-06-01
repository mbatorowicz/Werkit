import { jsonError, jsonOk, withApiErrorHandling } from "@/lib/apiRoute";
import { ScheduleConflictService } from "@/services/ScheduleConflictService";
import { requireCompanyScopedSession } from "@/lib/apiTenant";

export const dynamic = "force-dynamic";

export const GET = withApiErrorHandling(
  async (request: Request) => {
    const scoped = await requireCompanyScopedSession();
    if (!scoped.ok) return scoped.response;

    const { searchParams } = new URL(request.url);
    const userId = parseInt(searchParams.get("userId") ?? "", 10);
    const resourceId = parseInt(searchParams.get("resourceId") ?? "", 10);
    const dueDateRaw = searchParams.get("dueDate");
    const durationRaw = searchParams.get("expectedDurationHours");
    const excludeOrderIdRaw = searchParams.get("excludeOrderId");

    if (Number.isNaN(userId) || Number.isNaN(resourceId)) {
      return jsonError("missing_fields", 400);
    }

    const dueDate = dueDateRaw ? new Date(dueDateRaw) : null;
    const durationHours =
      durationRaw !== null && durationRaw.trim() !== "" ? parseFloat(durationRaw) : null;
    const excludeOrderId =
      excludeOrderIdRaw !== null && excludeOrderIdRaw.trim() !== ""
        ? parseInt(excludeOrderIdRaw, 10)
        : undefined;

    if (!dueDate || durationHours === null || Number.isNaN(durationHours) || durationHours <= 0) {
      const resourceConflicts = await ScheduleConflictService.findResourceBusyConflictsSerialized(
        scoped.data.companyId,
        userId,
        resourceId
      );
      return jsonOk({ conflicts: resourceConflicts });
    }

    const conflicts = await ScheduleConflictService.findConflictsForRequestSerialized(
      scoped.data.companyId,
      {
        userId,
        resourceId,
        dueDate,
        durationHours,
        excludeOrderId:
          excludeOrderId !== null && !Number.isNaN(excludeOrderId) ? excludeOrderId : undefined,
      }
    );

    return jsonOk({ conflicts });
  },
  { defaultErrorCode: "fetch_error" }
);
