import { db } from '@/db';
import { workOrders, customers, workSessions, users } from '@/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import {
  applyWorkOrderListJoins,
  newWorkOrderCreatorUserAlias,
  workOrderListSharedSelectFields,
} from '@/services/workOrders/workOrderListQueryParts';
import { normalizeWorkOrderPriority } from '@/features/worker/lib/workOrderPriority';
import { coordPairToNumericStrings } from '@/lib/coordsFromRequestBody';
import { computeLockedUntil, parseDurationHours } from '@/lib/scheduleConflict';
import { ScheduleConflictService } from '@/services/ScheduleConflictService';
import { coerceWorkOrderPriority, validateCategoryForOrder } from '@/lib/workOrderCategoryValidation';
import { parseOrderBody } from '@/lib/parseRouteParams';
import { assertOrderEntitiesBelongToCompany } from '@/lib/tenantContext';

export class WorkerOrderService {
  /**
   * Pobiera listę oczekujących zleceń dla danego pracownika.
   * Wspiera paginację (offset/limit).
   */
  static async getPendingOrders(
    userId: number,
    companyId: number,
    options?: { offset?: number; limit?: number },
  ) {
    const creator = newWorkOrderCreatorUserAlias();
    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 50;

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
      .where(
        and(
          eq(workOrders.companyId, companyId),
          eq(workOrders.userId, userId),
          eq(workOrders.status, 'PENDING'),
        ),
      )
      .orderBy(asc(workOrders.dueDate), asc(workOrders.createdAt))
      .limit(limit)
      .offset(offset);

    return rows.map((row) => ({
      ...row,
      priority: normalizeWorkOrderPriority(row.priority),
      hasPhotos: Boolean(row.hasPhotos),
      hasNotes: Boolean(row.hasNotes),
    }));
  }

  static async acceptOrder(
    userId: number,
    companyId: number,
    orderId: number,
    startCoord?: { lat: number; lng: number } | null,
  ) {
    const [order] = await db
      .select()
      .from(workOrders)
      .where(
        and(
          eq(workOrders.id, orderId),
          eq(workOrders.userId, userId),
          eq(workOrders.companyId, companyId),
        ),
      );
    if (!order) throw new Error('order_not_found');

    if (await ScheduleConflictService.hasActiveWorkerSession(companyId, userId)) {
      throw new Error('session_active');
    }

    const durationHours = parseDurationHours(order.expectedDurationHours);
    await ScheduleConflictService.assertNoScheduleConflict(companyId, {
      userId,
      resourceId: order.resourceId,
      dueDate: order.dueDate,
      durationHours,
      excludeOrderId: order.id,
    });

    let customerLocationId = order.customerLocationId;
    if (!customerLocationId && order.customerId) {
      const { CustomerLocationService } = await import("@/services/CustomerLocationService");
      const def = await CustomerLocationService.getDefaultForCustomer(order.customerId, companyId);
      if (def) customerLocationId = def.id;
    }

    const startNums = startCoord ? coordPairToNumericStrings(startCoord) : null;

    // Transakcja: UPDATE work_orders + INSERT work_sessions atomowo
    return await db.transaction(async (tx) => {
      await tx
        .update(workOrders)
        .set({
          status: 'IN_PROGRESS',
          ...(customerLocationId && !order.customerLocationId ? { customerLocationId } : {}),
          ...(order.dueDate && durationHours != null && !order.lockedUntil
            ? { lockedUntil: computeLockedUntil(order.dueDate, durationHours) }
            : {}),
        })
        .where(eq(workOrders.id, order.id));

      const [newSession] = await tx.insert(workSessions).values({
        companyId,
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
    });
  }

  /**
   * Tworzy nowe zlecenie przez pracownika (tzw. "własne zlecenie").
   * Przyjmuje surowy body (Record<string, unknown>) i samodzielnie parsuje/waliduje pola.
   * Rzuca Error z kodem błędu (np. "missing_fields", "invalid_payload", "forbidden").
   */
  static async createOwnOrder(
    userId: number,
    companyId: number,
    body: Record<string, unknown>,
  ): Promise<number> {
    const parsed = parseOrderBody(body);
    const payload = {
      ...parsed,
      priority: coerceWorkOrderPriority(parsed.priority),
    };
    const [userRow] = await db
      .select({ canCreateOwnOrders: users.canCreateOwnOrders })
      .from(users)
      .where(and(eq(users.id, userId), eq(users.companyId, companyId)))
      .limit(1);

    if (!userRow?.canCreateOwnOrders) {
      throw new Error('forbidden');
    }

    if (await ScheduleConflictService.hasActiveWorkerSession(companyId, userId)) {
      throw new Error('session_active');
    }

    // Cross-tenant validation: verify all referenced entities belong to the same company
    await assertOrderEntitiesBelongToCompany(payload, companyId);

    await validateCategoryForOrder(companyId, payload.categoryId, {
      customerId: payload.customerId,
      materialId: payload.materialId,
      quantityTons: payload.quantityTons,
      taskDescription: payload.taskDescription,
    });

    const durationHours = parseDurationHours(payload.expectedDurationHours);
    await ScheduleConflictService.assertNoScheduleConflict(companyId, {
      userId,
      resourceId: payload.resourceId,
      dueDate: payload.dueDate,
      durationHours,
    });

    const prio = coerceWorkOrderPriority(payload.priority);

    const [inserted] = await db
      .insert(workOrders)
      .values({
        companyId,
        userId,
        resourceId: payload.resourceId,
        categoryId: payload.categoryId,
        materialId: payload.materialId ?? null,
        customerId: payload.customerId ?? null,
        taskDescription: payload.taskDescription ?? null,
        quantityTons:
          payload.quantityTons != null && String(payload.quantityTons).trim() !== ""
            ? String(payload.quantityTons)
            : null,
        expectedDurationHours:
          payload.expectedDurationHours != null && String(payload.expectedDurationHours).trim() !== ""
            ? String(payload.expectedDurationHours)
            : null,
        dueDate: payload.dueDate ?? null,
        lockedUntil:
          payload.dueDate && durationHours != null
            ? computeLockedUntil(payload.dueDate, durationHours)
            : null,
        status: 'PENDING',
        priority: prio,
        createdById: userId,
      })
      .returning({ id: workOrders.id });

    return inserted.id;
  }
}
