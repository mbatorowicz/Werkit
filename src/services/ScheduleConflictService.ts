import { db } from "@/db";
import { workOrders, workSessions, users, resources, resourceCategories } from "@/db/schema";
import { and, eq, inArray, or } from "drizzle-orm";
import {
  findScheduleConflicts,
  orderRowToCandidate,
  scheduleConflictToLegacyMessage,
  sessionRowToCandidate,
  type ScheduleCandidate,
  type ScheduleConflict,
} from "@/lib/scheduleConflict";

export type ScheduleConflictRequest = {
  userId: number;
  resourceId: number;
  dueDate: Date | null;
  durationHours: number | null;
  excludeOrderId?: number;
  excludeSessionId?: number;
};

function serializeConflict(c: ScheduleConflict) {
  return {
    kind: c.kind,
    source: c.source,
    conflictingId: c.conflictingId,
    conflictingOrderId: c.conflictingOrderId ?? null,
    start: c.start.toISOString(),
    end: c.end.toISOString(),
    workerName: c.workerName ?? null,
    resourceName: c.resourceName ?? null,
    taskLabel: c.taskLabel ?? null,
  };
}

export class ScheduleConflictService {
  static async loadCandidates(
    companyId: number,
    userId: number,
    resourceId: number,
  ): Promise<ScheduleCandidate[]> {
    const orderFilter = and(
      eq(workOrders.companyId, companyId),
      or(eq(workOrders.userId, userId), eq(workOrders.resourceId, resourceId)),
      inArray(workOrders.status, ["PENDING", "IN_PROGRESS"]),
    );

    const sessionFilter = and(
      eq(workSessions.companyId, companyId),
      eq(workSessions.status, "IN_PROGRESS"),
      or(eq(workSessions.userId, userId), eq(workSessions.resourceId, resourceId)),
    );

    const [orderRows, sessionRows] = await Promise.all([
      db
        .select({
          id: workOrders.id,
          userId: workOrders.userId,
          resourceId: workOrders.resourceId,
          dueDate: workOrders.dueDate,
          expectedDurationHours: workOrders.expectedDurationHours,
          lockedUntil: workOrders.lockedUntil,
          status: workOrders.status,
          taskDescription: workOrders.taskDescription,
          categoryName: resourceCategories.name,
          workerName: users.fullName,
          resourceName: resources.name,
        })
        .from(workOrders)
        .leftJoin(users, eq(workOrders.userId, users.id))
        .leftJoin(resources, eq(workOrders.resourceId, resources.id))
        .leftJoin(resourceCategories, eq(workOrders.categoryId, resourceCategories.id))
        .where(orderFilter),
      db
        .select({
          id: workSessions.id,
          workOrderId: workSessions.workOrderId,
          userId: workSessions.userId,
          resourceId: workSessions.resourceId,
          startTime: workSessions.startTime,
          dueDate: workSessions.dueDate,
          expectedDurationHours: workSessions.expectedDurationHours,
          status: workSessions.status,
          taskDescription: workSessions.taskDescription,
          categoryName: resourceCategories.name,
          workerName: users.fullName,
          resourceName: resources.name,
        })
        .from(workSessions)
        .leftJoin(users, eq(workSessions.userId, users.id))
        .leftJoin(resources, eq(workSessions.resourceId, resources.id))
        .leftJoin(resourceCategories, eq(workSessions.categoryId, resourceCategories.id))
        .where(sessionFilter),
    ]);

    const candidates: ScheduleCandidate[] = [];
    for (const row of orderRows) {
      const c = orderRowToCandidate(row);
      if (c) candidates.push(c);
    }
    for (const row of sessionRows) {
      const c = sessionRowToCandidate(row);
      if (c) candidates.push(c);
    }
    return candidates;
  }

  static async findConflictsForRequest(
    companyId: number,
    request: ScheduleConflictRequest,
  ): Promise<ScheduleConflict[]> {
    const { userId, resourceId, dueDate, durationHours, excludeOrderId, excludeSessionId } = request;
    if (!dueDate || durationHours == null || durationHours <= 0) return [];

    const candidates = await ScheduleConflictService.loadCandidates(companyId, userId, resourceId);
    return findScheduleConflicts(candidates, {
      userId,
      resourceId,
      dueDate,
      durationHours,
      excludeOrderId,
      excludeSessionId,
    });
  }

  static async checkScheduleConflictLegacyMessage(
    companyId: number,
    request: ScheduleConflictRequest,
  ): Promise<string | null> {
    const conflicts = await ScheduleConflictService.findConflictsForRequest(companyId, request);
    return scheduleConflictToLegacyMessage(conflicts);
  }

  static async findConflictsForRequestSerialized(companyId: number, request: ScheduleConflictRequest) {
    const conflicts = await ScheduleConflictService.findConflictsForRequest(companyId, request);
    return conflicts.map(serializeConflict);
  }

  /** Czy zasób ma inną aktywną sesję IN_PROGRESS (real-time, wizard). */
  static async hasActiveResourceSession(
    companyId: number,
    resourceId: number,
    excludeUserId?: number,
  ): Promise<boolean> {
    const rows = await db
      .select({ id: workSessions.id, userId: workSessions.userId })
      .from(workSessions)
      .where(
        and(
          eq(workSessions.companyId, companyId),
          eq(workSessions.resourceId, resourceId),
          eq(workSessions.status, "IN_PROGRESS"),
        ),
      )
      .limit(5);

    return rows.some((r) => excludeUserId == null || r.userId !== excludeUserId);
  }

  /** Czy pracownik ma aktywną sesję IN_PROGRESS. */
  static async hasActiveWorkerSession(companyId: number, userId: number): Promise<boolean> {
    const rows = await db
      .select({ id: workSessions.id })
      .from(workSessions)
      .where(
        and(
          eq(workSessions.companyId, companyId),
          eq(workSessions.userId, userId),
          eq(workSessions.status, "IN_PROGRESS"),
        ),
      )
      .limit(1);
    return rows.length > 0;
  }

  /** Konflikt zajętego zasobu (bez terminu zlecenia) — aktywna sesja innego użytkownika. */
  static async findResourceBusyConflicts(
    companyId: number,
    userId: number,
    resourceId: number,
  ): Promise<ScheduleConflict[]> {
    const rows = await db
      .select({
        id: workSessions.id,
        workOrderId: workSessions.workOrderId,
        userId: workSessions.userId,
        resourceId: workSessions.resourceId,
        startTime: workSessions.startTime,
        dueDate: workSessions.dueDate,
        expectedDurationHours: workSessions.expectedDurationHours,
        status: workSessions.status,
        taskDescription: workSessions.taskDescription,
        categoryName: resourceCategories.name,
        workerName: users.fullName,
        resourceName: resources.name,
      })
      .from(workSessions)
      .leftJoin(users, eq(workSessions.userId, users.id))
      .leftJoin(resources, eq(workSessions.resourceId, resources.id))
      .leftJoin(resourceCategories, eq(workSessions.categoryId, resourceCategories.id))
      .where(
        and(
          eq(workSessions.companyId, companyId),
          eq(workSessions.resourceId, resourceId),
          eq(workSessions.status, "IN_PROGRESS"),
        ),
      )
      .limit(5);

    const conflicts: ScheduleConflict[] = [];
    for (const row of rows) {
      if (row.userId === userId) continue;
      const c = sessionRowToCandidate(row);
      if (!c) continue;
      conflicts.push({
        kind: "resource",
        source: "session",
        conflictingId: c.id,
        conflictingOrderId: row.workOrderId ?? undefined,
        start: c.start,
        end: c.end,
        workerName: row.workerName ?? undefined,
        resourceName: row.resourceName ?? undefined,
        taskLabel: c.taskLabel,
      });
    }
    return conflicts;
  }

  static async findResourceBusyConflictsSerialized(
    companyId: number,
    userId: number,
    resourceId: number,
  ) {
    const conflicts = await ScheduleConflictService.findResourceBusyConflicts(
      companyId,
      userId,
      resourceId,
    );
    return conflicts.map(serializeConflict);
  }
}
