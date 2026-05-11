import { db } from '@/db';
import {
  workOrders,
  resources,
  materials,
  customers,
  users,
  workSessions,
  resourceCategories,
} from '@/db/schema';
import { eq, and, aliasedTable, asc } from 'drizzle-orm';
import { sqlWorkOrderHasNotes, sqlWorkOrderHasPhotos } from '@/services/sql/attachmentExistsSql';
import { normalizeWorkOrderPriority } from '@/features/worker/lib/workOrderPriority';
import { coordPairToNumericStrings } from '@/lib/coordsFromRequestBody';

export class WorkerOrderService {
  /**
   * Pobiera listę oczekujących zleceń dla danego pracownika.
   */
  static async getPendingOrders(userId: number) {
    const creator = aliasedTable(users, 'creator');
    
    const rows = await db.select({
      id: workOrders.id,
      categoryId: workOrders.categoryId,
      categoryName: resourceCategories.name,
      taskDescription: workOrders.taskDescription,
      resourceName: resources.name,
      materialName: materials.name,
      customerName: customers.lastName,
      resourceId: workOrders.resourceId,
      materialId: workOrders.materialId,
      customerId: workOrders.customerId,
      creatorName: creator.fullName,
      quantityTons: workOrders.quantityTons,
      expectedDurationHours: workOrders.expectedDurationHours,
      priority: workOrders.priority,
      dueDate: workOrders.dueDate,
      createdAt: workOrders.createdAt,
      hasPhotos: sqlWorkOrderHasPhotos(),
      hasNotes: sqlWorkOrderHasNotes(),
    })
    .from(workOrders)
    .leftJoin(resources, eq(workOrders.resourceId, resources.id))
    .leftJoin(materials, eq(workOrders.materialId, materials.id))
    .leftJoin(customers, eq(workOrders.customerId, customers.id))
    .leftJoin(creator, eq(workOrders.createdById, creator.id))
    .leftJoin(resourceCategories, eq(workOrders.categoryId, resourceCategories.id))
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

    await db.update(workOrders).set({ status: 'IN_PROGRESS' }).where(eq(workOrders.id, order.id));

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
