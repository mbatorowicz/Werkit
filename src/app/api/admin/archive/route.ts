import { jsonOk, withApiErrorHandling } from "@/lib/apiRoute";
import { AdminOrderService } from '@/services/AdminOrderService';
import { requireCompanyScopedSession } from '@/lib/apiTenant';

export const dynamic = 'force-dynamic';

export const GET = withApiErrorHandling(async () => {
  const scoped = await requireCompanyScopedSession();
  if (!scoped.ok) return scoped.response;

  const data = await AdminOrderService.getArchivedSessions(scoped.data.companyId);
  return jsonOk(data);
}, { defaultErrorCode: "fetch_error" });
