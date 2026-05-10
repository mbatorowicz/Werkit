import { db } from '@/db';
import { workOrders, workSessions, users, resources, materials, customers } from '@/db/schema';
import { eq, desc, ne, aliasedTable } from 'drizzle-orm';

export class AdminOrderService {
  /**
   * Pobiera wszystkie zlecenia (workOrders), które nie są COMPLETED.
   */
  static async getActiveWorkOrders() {
    const creator = aliasedTable(users, 'creator');

    return db.select({
      id: workOrders.id,
      status: workOrders.status,
      sessionType: workOrders.sessionType,
      taskDescription: workOrders.taskDescription,
      createdAt: workOrders.createdAt,
      workerName: users.fullName,
      userId: workOrders.userId,
      creatorName: creator.fullName,
      resourceName: resources.name,
      resourceId: workOrders.resourceId,
      materialId: workOrders.materialId,
      materialName: materials.name,
      customerId: workOrders.customerId,
      customerFirstName: customers.firstName,
      customerLastName: customers.lastName,
      quantityTons: workOrders.quantityTons,
      priority: workOrders.priority,
      expectedDurationHours: workOrders.expectedDurationHours,
      dueDate: workOrders.dueDate
    })
    .from(workOrders)
    .leftJoin(users, eq(workOrders.userId, users.id))
    .leftJoin(creator, eq(workOrders.createdById, creator.id))
    .leftJoin(resources, eq(workOrders.resourceId, resources.id))
    .leftJoin(materials, eq(workOrders.materialId, materials.id))
    .leftJoin(customers, eq(workOrders.customerId, customers.id))
    .where(ne(workOrders.status, 'COMPLETED'))
    .orderBy(desc(workOrders.createdAt));
  }

  /**
   * Pobiera historię aktywnych oraz archiwalnych sesji.
   */
  static async getArchivedSessions(limitCount = 500) {
    return db.select({
       id: workSessions.id,
       workOrderId: workSessions.workOrderId,
       status: workSessions.status,
       sessionType: workSessions.sessionType,
       taskDescription: workSessions.taskDescription,
       startTime: workSessions.startTime,
       endTime: workSessions.endTime,
       workerName: users.fullName,
       userId: workSessions.userId,
       resourceName: resources.name,
       resourceId: workSessions.resourceId,
       materialId: workSessions.materialId,
       materialName: materials.name,
       customerId: workSessions.customerId,
       customerFirstName: customers.firstName,
       customerLastName: customers.lastName,
       quantityTons: workSessions.quantityTons,
       expectedDurationHours: workSessions.expectedDurationHours,
       dueDate: workSessions.dueDate
     })
     .from(workSessions)
     .leftJoin(users, eq(workSessions.userId, users.id))
     .leftJoin(resources, eq(workSessions.resourceId, resources.id))
     .leftJoin(materials, eq(workSessions.materialId, materials.id))
     .leftJoin(customers, eq(workSessions.customerId, customers.id))
     .orderBy(desc(workSessions.startTime))
     .limit(limitCount);
  }
  static async updateOrder(orderId: number, updates: Partial<typeof workOrders.$inferInsert>) {
    const existingOrder = await db.select().from(workOrders).where(eq(workOrders.id, orderId)).limit(1);
    if (existingOrder.length === 0) throw new Error('not_found');
    if (existingOrder[0].status !== 'PENDING') throw new Error('not_pending');

    await db.update(workOrders).set(updates).where(eq(workOrders.id, orderId));
  }

  static async deleteOrder(orderId: number) {
    await db.delete(workOrders).where(eq(workOrders.id, orderId));
  }
}
