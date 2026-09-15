import { NextResponse } from "next/server";
import { jsonError, withApiErrorHandling } from "@/lib/apiRoute";
import { requireAdminPanelSession } from "@/lib/apiTenant";
import { DEVICE_LOGS_EXPORT_MAX } from "@/lib/deviceLogLimits";
import { DeviceLogsExportRateLimitService } from "@/services/DeviceLogsExportRateLimitService";

export const dynamic = "force-dynamic";

export const GET = withApiErrorHandling(
  async () => {
    const scoped = await requireAdminPanelSession();
    if (!scoped.ok) return scoped.response;

    const { companyId } = scoped.data;
    if (await DeviceLogsExportRateLimitService.isLimited(companyId)) {
      return jsonError("too_many_exports", 429);
    }
    await DeviceLogsExportRateLimitService.record(companyId);

    const { SystemLogService } = await import("@/services/SystemLogService");
    const rows = await SystemLogService.getRecentLogs(companyId, DEVICE_LOGS_EXPORT_MAX);
    const body = JSON.stringify(rows);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const filename = `werkit-device-logs-${stamp}.json`;

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  },
  { defaultErrorCode: "export_failed" }
);
