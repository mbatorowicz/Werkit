import { jsonError, jsonOk, parseJsonBodyOrEmpty, withApiErrorHandling } from "@/lib/apiRoute";
import { getUserId } from '@/lib/auth';
import { coordsFromRequestBody } from '@/lib/coordsFromRequestBody';
import { parsePositiveIntFromString } from '@/lib/parseRouteParams';
import { WorkerOrderService } from '@/services/WorkerOrderService';

export const POST = withApiErrorHandling(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const userId = await getUserId();
    if (!userId) return jsonError("Unauthorized", 401);
    const { id } = await params;
    const orderId = parsePositiveIntFromString(id);
    if (orderId == null) {
      return jsonError("invalid_id", 400);
    }

    const body = await parseJsonBodyOrEmpty(request);
    const startCoord = coordsFromRequestBody(body);

    const sessionId = await WorkerOrderService.acceptOrder(userId, orderId, startCoord);
    return jsonOk({ success: true, sessionId });
  },
  {
    mapUnknownError: (err) => (err instanceof Error && err.message === "order_not_found" ? jsonError("order_not_found", 404) : null),
    defaultErrorCode: "save_error",
  },
);
