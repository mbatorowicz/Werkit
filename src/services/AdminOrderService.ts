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
import { eq, desc, aliasedTable, and } from 'drizzle-orm';
import {
  applyWorkOrderListJoins,
  newWorkOrderCreatorUserAlias,
  workOrderListSharedSelectFields,
} from '@/services/workOrders/workOrderListQueryParts';
import { sqlSessionHasNotes, sqlSessionHasPhotos } from '@/services/sql/attachmentExistsSql';
import { computeLockedUntil } from '@/lib/scheduleConflict';
import { ScheduleConflictService } from '@/services/ScheduleConflictService';
import { assertOrderEntitiesBelongToCompany } from '@/lib/tenantContext';

export class AdminOrderService {
  /** Koniec rezerwacji harmonogramu — `null` gdy brak terminu lub czasu trwania. */
  static resolveLockedUntil(dueDate: Date | null, durationHours: number | null): Date | null {
    if (!dueDate || durationHours == null || durationHours <= 0) return null;
    return computeLockedUntil(dueDate, durationHours);
  }

  /**
   * Kod błędu API przy zapisie zlecenia (409) albo `null`, gdy brak blokady.
   */
  static async getScheduleSaveBlockCode(
    companyId: number,
    userId: number,
    resourceId: number,
    dueDate: Date | null,
    durationHours: number | null,
    excludeOrderId?: number,
  ): Promise<"schedule_conflict" | "resource_busy" | null> {
    try {
      await ScheduleConflictService.assertNoScheduleConflict(companyId, {
        userId,
        resourceId,
        dueDate,
        durationHours,
        excludeOrderId,
      });
      return null;
    } catch (e) {
      if (e instanceof Error && e.message === 'schedule_conflict') return "schedule_conflict";
      if (e instanceof Error && e.message === 'resource_busy') return "resource_busy";
      throw e;
    }
  }

  /**
   * @deprecated Użyj {@link getScheduleSaveBlockCode} — zwraca kanoniczny kod błędu zamiast komunikatu PL.
   */
  static async checkScheduleConflict(
    companyId: number,
    userId: number,
    resourceId: number,
    dueDate: Date | null,
    durationHours: number | null,
    excludeOrderId?: number,
  ): Promise<string | null> {
    return ScheduleConflictService.checkScheduleConflictLegacyMessage(companyId, {
      userId,
      resourceId,
      dueDate,
      durationHours,
      excludeOrderId,
    });
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
    const companyId = orderData.companyId;
    if (companyId == null) throw new Error('missing_company');

    // Cross-tenant validation: verify all referenced entities belong to the same company
    await assertOrderEntitiesBelongToCompany(orderData, companyId);

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
