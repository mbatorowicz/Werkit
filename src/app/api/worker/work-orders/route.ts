import { jsonError, jsonOk, withApiErrorHandling } from "@/lib/apiRoute";
import { getUserId } from '@/lib/auth';
import { WorkerOrderService } from '@/services/WorkerOrderService';

export const dynamic = 'force-dynamic';

export const GET = withApiErrorHandling(async () => {
  const userId = await getUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  const orders = await WorkerOrderService.getPendingOrders(userId);
  return jsonOk(orders);
}, { defaultErrorCode: "fetch_error" });
