import { db } from '@/db';
import { workOrders, resources, materials, customers, users } from '@/db/schema';
import { eq, and, aliasedTable, asc } from 'drizzle-orm';

export class WorkerOrderService {
  /**
   * Pobiera listę oczekujących zleceń dla danego pracownika.
   */
  static async getPendingOrders(userId: number) {
    const creator = aliasedTable(users, 'creator');
    
    return db.select({
      id: workOrders.id,
      sessionType: workOrders.sessionType,
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
    .where(and(eq(workOrders.userId, userId), eq(workOrders.status, 'PENDING')))
    .orderBy(asc(workOrders.dueDate), asc(workOrders.createdAt));
  }
}
