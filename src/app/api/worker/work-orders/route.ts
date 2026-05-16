import { jsonOk, withApiErrorHandling } from "@/lib/apiRoute";
import { WorkerOrderService } from '@/services/WorkerOrderService';
import { requireWorkerCompanySession } from '@/lib/apiTenant';

export const dynamic = 'force-dynamic';

export const GET = withApiErrorHandling(async () => {
  const ctx = await requireWorkerCompanySession();
  if (!ctx.ok) return ctx.response;

  const orders = await WorkerOrderService.getPendingOrders(ctx.userId, ctx.companyId);
  return jsonOk(orders);
}, { defaultErrorCode: "fetch_error" });
