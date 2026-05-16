import { db } from '@/db';
import { workOrders, customers, workSessions } from '@/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import {
  applyWorkOrderListJoins,
  newWorkOrderCreatorUserAlias,
  workOrderListSharedSelectFields,
} from '@/services/workOrders/workOrderListQueryParts';
import { normalizeWorkOrderPriority } from '@/features/worker/lib/workOrderPriority';
import { coordPairToNumericStrings } from '@/lib/coordsFromRequestBody';

export class WorkerOrderService {
  /**
   * Pobiera listę oczekujących zleceń dla danego pracownika.
   */
  static async getPendingOrders(userId: number) {
    const creator = newWorkOrderCreatorUserAlias();

    const rows = await applyWorkOrderListJoins(
      db
        .select({
          ...workOrderListSharedSelectFields(creator),
          customerName: customers.lastName,
        })
        .from(workOrders),
      creator,
      { joinAssignedWorker: false },
    )
      .where(and(eq(workOrders.userId, userId), eq(workOrders.status, 'PENDING')))
      .orderBy(asc(workOrders.dueDate), asc(workOrders.createdAt));

    return rows.map((row) => ({
      ...row,
      priority: normalizeWorkOrderPriority(row.priority),
      hasPhotos: Boolean(row.hasPhotos),
      hasNotes: Boolean(row.hasNotes),
    }));
  }

  static async acceptOrder(
    userId: number,
    orderId: number,
    startCoord?: { lat: number; lng: number } | null,
  ) {
    const [order] = await db.select().from(workOrders).where(and(eq(workOrders.id, orderId), eq(workOrders.userId, userId)));
    if (!order) throw new Error('order_not_found');

    let customerLocationId = order.customerLocationId;
    if (!customerLocationId && order.customerId) {
      const { CustomerLocationService } = await import("@/services/CustomerLocationService");
      const def = await CustomerLocationService.getDefaultForCustomer(order.customerId);
      if (def) customerLocationId = def.id;
    }

    await db
      .update(workOrders)
      .set({
        status: 'IN_PROGRESS',
        ...(customerLocationId && !order.customerLocationId ? { customerLocationId } : {}),
      })
      .where(eq(workOrders.id, order.id));

    const startNums = startCoord ? coordPairToNumericStrings(startCoord) : null;

    const [newSession] = await db.insert(workSessions).values({
      workOrderId: order.id,
      userId: userId,
      categoryId: order.categoryId!,
      resourceId: order.resourceId,
      materialId: order.materialId,
      customerId: order.customerId,
      taskDescription: order.taskDescription,
      quantityTons: order.quantityTons,
      expectedDurationHours: order.expectedDurationHours,
      dueDate: order.dueDate,
      status: 'IN_PROGRESS',
      ...(startNums
        ? {
            startLatitude: startNums.lat,
            startLongitude: startNums.lng,
          }
        : {}),
    }).returning();

    return newSession.id;
  }
}
