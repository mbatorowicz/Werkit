import { NextResponse } from "next/server";
import { jsonError, withApiErrorHandling } from "@/lib/apiRoute";
import { requireCompanyScopedSession } from '@/lib/apiTenant';
import { DEVICE_LOGS_EXPORT_MAX } from "@/lib/deviceLogLimits";

export const dynamic = "force-dynamic";

export const GET = withApiErrorHandling(async () => {
  const scoped = await requireCompanyScopedSession();
  if (!scoped.ok) return scoped.response;

  const { SystemLogService } = await import("@/services/SystemLogService");
  const rows = await SystemLogService.getRecentLogs(scoped.data.companyId, DEVICE_LOGS_EXPORT_MAX);
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
}, { defaultErrorCode: "export_failed" });
