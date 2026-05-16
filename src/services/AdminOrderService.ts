import { db } from '@/db';
import {
  workOrders,
  workSessions,
  users,
  resources,
  materials,
  customers,
  resourceCategories,
} from '@/db/schema';
import { eq, desc, aliasedTable, or, and, inArray } from 'drizzle-orm';
import {
  applyWorkOrderListJoins,
  newWorkOrderCreatorUserAlias,
  workOrderListSharedSelectFields,
} from '@/services/workOrders/workOrderListQueryParts';
import { sqlSessionHasNotes, sqlSessionHasPhotos } from '@/services/sql/attachmentExistsSql';

export class AdminOrderService {
  /**
   * Sprawdza nakładanie się terminów z innymi zleceniami `PENDING` dla tego samego pracownika lub zasobu.
   * Zwraca komunikat PL dla UI albo `null`, gdy brak konfliktu.
   */
  static async checkScheduleConflict(
    companyId: number,
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
          eq(workOrders.companyId, companyId),
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
  static async getActiveWorkOrders(companyId: number) {
    const creator = newWorkOrderCreatorUserAlias();

    return applyWorkOrderListJoins(
      db
        .select({
          ...workOrderListSharedSelectFields(creator),
          status: workOrders.status,
          categoryIsStationary: resourceCategories.isStationary,
          workerName: users.fullName,
          userId: workOrders.userId,
          customerFirstName: customers.firstName,
          customerLastName: customers.lastName,
        })
        .from(workOrders),
      creator,
      { joinAssignedWorker: true },
    )
      .where(and(eq(workOrders.companyId, companyId), eq(workOrders.status, 'PENDING')))
      .orderBy(desc(workOrders.createdAt));
  }

  /**
   * Pobiera historię aktywnych oraz archiwalnych sesji.
   */
  static async getArchivedSessions(companyId: number, limitCount = 500) {
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
       hasPhotos: sqlSessionHasPhotos(),
       hasNotes: sqlSessionHasNotes(),
     })
     .from(workSessions)
     .leftJoin(users, eq(workSessions.userId, users.id))
      .leftJoin(workOrders, eq(workSessions.workOrderId, workOrders.id))
      .leftJoin(creator, eq(workOrders.createdById, creator.id))
     .leftJoin(resourceCategories, eq(workSessions.categoryId, resourceCategories.id))
     .leftJoin(resources, eq(workSessions.resourceId, resources.id))
     .leftJoin(materials, eq(workSessions.materialId, materials.id))
     .leftJoin(customers, eq(workSessions.customerId, customers.id))
     .where(eq(workSessions.companyId, companyId))
     .orderBy(desc(workSessions.startTime))
     .limit(limitCount);
  }

  static async createOrder(orderData: typeof workOrders.$inferInsert) {
    await db.insert(workOrders).values(orderData);
  }

  static async updateOrder(
    companyId: number,
    orderId: number,
    updates: Partial<typeof workOrders.$inferInsert>,
  ) {
    const existingOrder = await db
      .select()
      .from(workOrders)
      .where(and(eq(workOrders.id, orderId), eq(workOrders.companyId, companyId)))
      .limit(1);
    if (existingOrder.length === 0) throw new Error('not_found');
    if (existingOrder[0].status !== 'PENDING') throw new Error('not_pending');

    await db
      .update(workOrders)
      .set(updates)
      .where(and(eq(workOrders.id, orderId), eq(workOrders.companyId, companyId)));
  }

  /** Usuwa zlecenie i sesje z `work_order_id` (podrzędne GPS/zdjęcia/notatki — kaskada z sesji). */
  static async deleteOrder(companyId: number, orderId: number) {
    const rows = await db
      .select({ id: workOrders.id })
      .from(workOrders)
      .where(and(eq(workOrders.id, orderId), eq(workOrders.companyId, companyId)))
      .limit(1);
    if (rows.length === 0) throw new Error('not_found');

    await db.transaction(async (tx) => {
      await tx.delete(workSessions).where(eq(workSessions.workOrderId, orderId));
      await tx
        .delete(workOrders)
        .where(and(eq(workOrders.id, orderId), eq(workOrders.companyId, companyId)));
    });
  }
}
