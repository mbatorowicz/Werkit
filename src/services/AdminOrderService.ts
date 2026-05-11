import { db } from '@/db';
import {
  workOrders,
  workSessions,
  users,
  resources,
  materials,
  customers,
  sessionPhotos,
  sessionNotes,
  resourceCategories,
} from '@/db/schema';
import { eq, desc, aliasedTable, sql, or, and, inArray } from 'drizzle-orm';

export class AdminOrderService {
  /**
   * Sprawdza nakładanie się terminów z innymi zleceniami `PENDING` dla tego samego pracownika lub zasobu.
   * Zwraca komunikat PL dla UI albo `null`, gdy brak konfliktu.
   */
  static async checkScheduleConflict(
    userId: number,
    resourceId: number,
    dueDate: Date | null,
    durationHours: number | null,
    excludeOrderId?: number,
  ): Promise<string | null> {
    if (!dueDate || !durationHours) return null;

    const startT = dueDate.getTime();
    const endT = startT + durationHours * 3600000;

    const activeOrders = await db
      .select()
      .from(workOrders)
      .where(
        and(
          or(eq(workOrders.userId, userId), eq(workOrders.resourceId, resourceId)),
          inArray(workOrders.status, ['PENDING', 'IN_PROGRESS']),
        ),
      );

    for (const order of activeOrders) {
      if (excludeOrderId && order.id === excludeOrderId) continue;
      if (!order.dueDate || !order.expectedDurationHours) continue;

      const oStart = order.dueDate.getTime();
      const oEnd = oStart + parseFloat(order.expectedDurationHours as string) * 3600000;

      if (startT < oEnd && endT > oStart) {
        if (order.userId === userId)
          return `Pracownik ma już w tym czasie przypisane zlecenie #${order.id}.`;
        if (order.resourceId === resourceId)
          return `Maszyna/Pojazd jest już w tym czasie zarezerwowana w zleceniu #${order.id}.`;
      }
    }

    return null;
  }

  /**
   * Pobiera zlecenia w kolejce dyspozycji — wyłącznie `PENDING` (zrealizowane / w toku realizacji poza kolejką).
   */
  static async getActiveWorkOrders() {
    const creator = aliasedTable(users, 'creator');

    return db.select({
      id: workOrders.id,
      status: workOrders.status,
      categoryId: workOrders.categoryId,
      categoryName: resourceCategories.name,
      categoryIsStationary: resourceCategories.isStationary,
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
      dueDate: workOrders.dueDate,
      hasPhotos: sql<boolean>`EXISTS (
        SELECT 1 FROM ${sessionPhotos}
        INNER JOIN ${workSessions} ON ${workSessions.id} = ${sessionPhotos.workSessionId}
        WHERE ${workSessions.workOrderId} = ${workOrders.id}
      )`,
      hasNotes: sql<boolean>`EXISTS (
        SELECT 1 FROM ${sessionNotes}
        INNER JOIN ${workSessions} ON ${workSessions.id} = ${sessionNotes.workSessionId}
        WHERE ${workSessions.workOrderId} = ${workOrders.id}
      )`,
    })
    .from(workOrders)
    .leftJoin(users, eq(workOrders.userId, users.id))
    .leftJoin(creator, eq(workOrders.createdById, creator.id))
    .leftJoin(resourceCategories, eq(workOrders.categoryId, resourceCategories.id))
    .leftJoin(resources, eq(workOrders.resourceId, resources.id))
    .leftJoin(materials, eq(workOrders.materialId, materials.id))
    .leftJoin(customers, eq(workOrders.customerId, customers.id))
    .where(eq(workOrders.status, 'PENDING'))
    .orderBy(desc(workOrders.createdAt));
  }

  /**
   * Pobiera historię aktywnych oraz archiwalnych sesji.
   */
  static async getArchivedSessions(limitCount = 500) {
    const creator = aliasedTable(users, 'creator');
    return db.select({
       id: workSessions.id,
       workOrderId: workSessions.workOrderId,
       status: workSessions.status,
       categoryId: workSessions.categoryId,
       categoryName: resourceCategories.name,
       categoryIsStationary: resourceCategories.isStationary,
       taskDescription: workSessions.taskDescription,
       startTime: workSessions.startTime,
       endTime: workSessions.endTime,
       workerName: users.fullName,
       userId: workSessions.userId,
       creatorName: creator.fullName,
       resourceName: resources.name,
       resourceId: workSessions.resourceId,
       materialId: workSessions.materialId,
       materialName: materials.name,
       customerId: workSessions.customerId,
       customerFirstName: customers.firstName,
       customerLastName: customers.lastName,
       quantityTons: workSessions.quantityTons,
       expectedDurationHours: workSessions.expectedDurationHours,
       dueDate: workSessions.dueDate,
       hasPhotos: sql<boolean>`EXISTS (
         SELECT 1 FROM ${sessionPhotos}
         WHERE ${sessionPhotos.workSessionId} = ${workSessions.id}
       )`,
       hasNotes: sql<boolean>`EXISTS (
         SELECT 1 FROM ${sessionNotes}
         WHERE ${sessionNotes.workSessionId} = ${workSessions.id}
       )`,
     })
     .from(workSessions)
     .leftJoin(users, eq(workSessions.userId, users.id))
      .leftJoin(workOrders, eq(workSessions.workOrderId, workOrders.id))
      .leftJoin(creator, eq(workOrders.createdById, creator.id))
     .leftJoin(resourceCategories, eq(workSessions.categoryId, resourceCategories.id))
     .leftJoin(resources, eq(workSessions.resourceId, resources.id))
     .leftJoin(materials, eq(workSessions.materialId, materials.id))
     .leftJoin(customers, eq(workSessions.customerId, customers.id))
     .orderBy(desc(workSessions.startTime))
     .limit(limitCount);
  }

  static async createOrder(orderData: typeof workOrders.$inferInsert) {
    await db.insert(workOrders).values(orderData);
  }
  static async updateOrder(orderId: number, updates: Partial<typeof workOrders.$inferInsert>) {
    const existingOrder = await db.select().from(workOrders).where(eq(workOrders.id, orderId)).limit(1);
    if (existingOrder.length === 0) throw new Error('not_found');
    if (existingOrder[0].status !== 'PENDING') throw new Error('not_pending');

    await db.update(workOrders).set(updates).where(eq(workOrders.id, orderId));
  }

  /** Usuwa zlecenie i sesje z `work_order_id` (podrzędne GPS/zdjęcia/notatki — kaskada z sesji). */
  static async deleteOrder(orderId: number) {
    const rows = await db.select({ id: workOrders.id }).from(workOrders).where(eq(workOrders.id, orderId)).limit(1);
    if (rows.length === 0) throw new Error('not_found');

    await db.transaction(async (tx) => {
      await tx.delete(workSessions).where(eq(workSessions.workOrderId, orderId));
      await tx.delete(workOrders).where(eq(workOrders.id, orderId));
    });
  }
}
