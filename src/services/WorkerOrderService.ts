import { db } from '@/db';
import { workOrders, resources, materials, customers, users, workSessions } from '@/db/schema';
import { eq, and, aliasedTable, asc } from 'drizzle-orm';
import { resourceCategories } from '@/db/schema';
import { normalizeWorkOrderPriority } from '@/features/worker/lib/workOrderPriority';

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
      createdAt: workOrders.createdAt
    })
    .from(workOrders)
    .leftJoin(resources, eq(workOrders.resourceId, resources.id))
    .leftJoin(materials, eq(workOrders.materialId, materials.id))
    .leftJoin(customers, eq(workOrders.customerId, customers.id))
    .leftJoin(creator, eq(workOrders.createdById, creator.id))
    .leftJoin(resourceCategories, eq(workOrders.categoryId, resourceCategories.id))
    .where(and(eq(workOrders.userId, userId), eq(workOrders.status, 'PENDING')))
    .orderBy(asc(workOrders.dueDate), asc(workOrders.createdAt));

    return rows.map(row => ({
      ...row,
      priority: normalizeWorkOrderPriority(row.priority),
    }));
  }

  static async acceptOrder(userId: number, orderId: number) {
    const [order] = await db.select().from(workOrders).where(and(eq(workOrders.id, orderId), eq(workOrders.userId, userId)));
    if (!order) throw new Error('order_not_found');

    await db.update(workOrders).set({ status: 'COMPLETED' }).where(eq(workOrders.id, order.id));

    const [newSession] = await db.insert(workSessions).values({
      workOrderId: order.id,
      userId: userId,
      categoryId: order.categoryId!,
      sessionType: 'MIGRATED',
      resourceId: order.resourceId,
      materialId: order.materialId,
      customerId: order.customerId,
      taskDescription: order.taskDescription,
      quantityTons: order.quantityTons,
      expectedDurationHours: order.expectedDurationHours,
      dueDate: order.dueDate,
      status: 'IN_PROGRESS'
    }).returning();

    return newSession.id;
  }
}
