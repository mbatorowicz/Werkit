import { db } from "@/db";
import {
  workOrders,
  workSessions,
  users,
  resources,
  materials,
  customers,
  resourceCategories,
} from "@/db/schema";
import { eq, desc, aliasedTable, and, type SQL } from "drizzle-orm";
import {
  applyWorkOrderListJoins,
  newWorkOrderCreatorUserAlias,
  workOrderListSharedSelectFields,
} from "@/services/workOrders/workOrderListQueryParts";
import { sqlSessionHasNotes, sqlSessionHasPhotos } from "@/services/sql/attachmentExistsSql";
import { computeLockedUntil } from "@/lib/scheduleConflict";
import { ScheduleConflictService } from "@/services/ScheduleConflictService";
import { assertOrderEntitiesBelongToCompany } from "@/lib/tenantContext";
import { DelegationScopeService } from "@/services/DelegationScopeService";

export type OrderMutationActor = {
  userId: number;
  role: string;
};

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
    excludeOrderId?: number
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
      if (e instanceof Error && e.message === "schedule_conflict") return "schedule_conflict";
      if (e instanceof Error && e.message === "resource_busy") return "resource_busy";
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
    excludeOrderId?: number
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
      { joinAssignedWorker: true }
    )
      .where(and(eq(workOrders.companyId, companyId), eq(workOrders.status, "PENDING")))
      .orderBy(desc(workOrders.createdAt));
  }

  /** Wspólne pola listy sesji (dyspozycja / archiwum). */
  private static buildSessionListQuery(creator: typeof users) {
    return db
      .select({
        id: workSessions.id,
        workOrderId: workSessions.workOrderId,
        status: workSessions.status,
        categoryId: workSessions.categoryId,
        categoryName: resourceCategories.name,
        categoryColor: resourceCategories.color,
        categoryShowMaterial: resourceCategories.showMaterial,
        categoryShowCustomer: resourceCategories.showCustomer,
        categoryShowQuantity: resourceCategories.showQuantity,
        categoryShowTaskDescription: resourceCategories.showTaskDescription,
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
        customerPhone: customers.phone,
        customerAddress: customers.defaultAddress,
        quantityTons: workSessions.quantityTons,
        expectedDurationHours: workSessions.expectedDurationHours,
        dueDate: workSessions.dueDate,
        hasPhotos: sqlSessionHasPhotos(),
        hasNotes: sqlSessionHasNotes(),
        orderType: workSessions.orderType,
        repairDescription: workSessions.repairDescription,
      })
      .from(workSessions)
      .leftJoin(users, eq(workSessions.userId, users.id))
      .leftJoin(workOrders, eq(workSessions.workOrderId, workOrders.id))
      .leftJoin(creator, eq(workOrders.createdById, creator.id))
      .leftJoin(resourceCategories, eq(workSessions.categoryId, resourceCategories.id))
      .leftJoin(resources, eq(workSessions.resourceId, resources.id))
      .leftJoin(materials, eq(workSessions.materialId, materials.id))
      .leftJoin(customers, eq(workSessions.customerId, customers.id));
  }

  private static querySessionsForDispatch(
    companyId: number,
    extraWhere: SQL | undefined,
    limitCount?: number,
    offsetCount?: number
  ) {
    const creator = aliasedTable(users, "creator");
    const baseWhere = eq(workSessions.companyId, companyId);
    const filtered = AdminOrderService.buildSessionListQuery(creator).where(
      extraWhere ? and(baseWhere, extraWhere) : baseWhere
    );
    const ordered = filtered.orderBy(desc(workSessions.startTime));
    if (limitCount != null && offsetCount != null && offsetCount > 0) {
      return ordered.limit(limitCount).offset(offsetCount);
    }
    if (limitCount != null) {
      return ordered.limit(limitCount);
    }
    return ordered;
  }

  /** Sesje w toku — odświeżane co interwał „live” w dyspozycji. */
  static async getInProgressSessions(companyId: number) {
    return AdminOrderService.querySessionsForDispatch(
      companyId,
      eq(workSessions.status, "IN_PROGRESS")
    );
  }

  /** Zakończone sesje — lazy-load archiwum w dyspozycji. */
  static async getCompletedArchiveSessions(companyId: number, limitCount = 500, offsetCount = 0) {
    return AdminOrderService.querySessionsForDispatch(
      companyId,
      eq(workSessions.status, "COMPLETED"),
      limitCount,
      offsetCount
    );
  }

  /**
   * @deprecated Użyj {@link getCompletedArchiveSessions} — zwraca wyłącznie zakończone sesje.
   */
  static async getArchivedSessions(companyId: number, limitCount = 500) {
    return AdminOrderService.getCompletedArchiveSessions(companyId, limitCount, 0);
  }

  static async createOrder(orderData: typeof workOrders.$inferInsert, actor?: OrderMutationActor) {
    const companyId = orderData.companyId;
    if (companyId == null) throw new Error("missing_company");

    await assertOrderEntitiesBelongToCompany(orderData, companyId);

    if (actor) {
      await DelegationScopeService.assertCanDelegateTo(
        companyId,
        actor.userId,
        actor.role,
        orderData.userId
      );
    }

    await db.insert(workOrders).values(orderData);
  }

  static async updateOrder(
    companyId: number,
    orderId: number,
    updates: Partial<typeof workOrders.$inferInsert>,
    actor?: OrderMutationActor
  ) {
    const existingOrder = await db
      .select()
      .from(workOrders)
      .where(and(eq(workOrders.id, orderId), eq(workOrders.companyId, companyId)))
      .limit(1);
    if (existingOrder.length === 0) throw new Error("not_found");
    if (existingOrder[0].status !== "PENDING") throw new Error("not_pending");

    const merged = { ...existingOrder[0], ...updates };
    await assertOrderEntitiesBelongToCompany(merged, companyId);

    const targetUserId = updates.userId ?? existingOrder[0].userId;
    if (actor) {
      await DelegationScopeService.assertCanDelegateTo(
        companyId,
        actor.userId,
        actor.role,
        targetUserId
      );
    }

    await db
      .update(workOrders)
      .set(updates)
      .where(and(eq(workOrders.id, orderId), eq(workOrders.companyId, companyId)));
  }

  /** Usuwa zlecenie i sesje z `work_order_id` (podrzędne GPS/zdjęcia/notatki — kaskada z sesji). */
  static async deleteOrder(companyId: number, orderId: number, actorUserId?: number) {
    const rows = await db
      .select({ id: workOrders.id })
      .from(workOrders)
      .where(and(eq(workOrders.id, orderId), eq(workOrders.companyId, companyId)))
      .limit(1);
    if (rows.length === 0) throw new Error("not_found");

    await db.transaction(async (tx) => {
      const { WorkSessionMaterialService } =
        await import("@/services/materials/WorkSessionMaterialService");
      await WorkSessionMaterialService.returnForOrderSessions(
        companyId,
        actorUserId ?? companyId,
        orderId,
        tx
      );

      await tx.delete(workSessions).where(eq(workSessions.workOrderId, orderId));
      await tx
        .delete(workOrders)
        .where(and(eq(workOrders.id, orderId), eq(workOrders.companyId, companyId)));
    });
  }
}
