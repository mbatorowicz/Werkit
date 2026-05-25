import { db } from '@/db';
import { workSessions, resources, materials, customers, sessionPhotos, sessionNotes, companySettings, users, workOrders, gpsLogs, resourceCategories } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { coordPairToNumericStrings, coordsFromRequestBody } from '@/lib/coordsFromRequestBody';
import { sqlSessionHasNotes, sqlSessionHasPhotos } from '@/services/sql/attachmentExistsSql';
import { CustomerLocationService } from '@/services/CustomerLocationService';
import { ScheduleConflictService } from '@/services/ScheduleConflictService';
import { pickWorkerUserFlags } from '@/lib/workerUserPermissions';
import { parsePositiveIntParam } from '@/lib/parseRouteParams';
import { getDownloadUrl } from '@vercel/blob';

export class WorkerSessionService {
  private static activeSessionWhere(userId: number, companyId: number) {
    return and(
      eq(workSessions.userId, userId),
      eq(workSessions.companyId, companyId),
      eq(workSessions.status, 'IN_PROGRESS'),
    );
  }
  /**
   * Pobiera aktualną, aktywną sesję pracownika wraz ze zdjęciami, notatkami, ustawieniami firmy i danymi usera.
   */
  static async getActiveSessionWithDetails(userId: number, companyId: number) {
    const activeSessions = await db.select({
      session: workSessions,
      customerAddress: customers.defaultAddress,
      customerLat: customers.latitude,
      customerLng: customers.longitude,
      customerFirstName: customers.firstName,
      customerLastName: customers.lastName,
      resourceName: resources.name,
      categoryId: workSessions.categoryId,
      categoryName: resourceCategories.name,
      categoryIsStationary: resourceCategories.isStationary,
      materialName: materials.name
    }).from(workSessions)
    .leftJoin(customers, eq(workSessions.customerId, customers.id))
    .leftJoin(resources, eq(workSessions.resourceId, resources.id))
    .leftJoin(resourceCategories, eq(workSessions.categoryId, resourceCategories.id))
    .leftJoin(materials, eq(workSessions.materialId, materials.id))
    .where(WorkerSessionService.activeSessionWhere(userId, companyId)).limit(1);

    const settingsRows = await db
      .select()
      .from(companySettings)
      .where(eq(companySettings.companyId, companyId))
      .limit(1);
    const companySettingsData = settingsRows[0] || null;

    const userRows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const userData = userRows[0] ? pickWorkerUserFlags(userRows[0]) : null;

    if (activeSessions.length === 0) {
      return { session: null, settings: companySettingsData, user: userData, events: [], notes: [] };
    }

    const data = activeSessions[0];
    const photos = (await db.select().from(sessionPhotos).where(eq(sessionPhotos.workSessionId, data.session.id))).map((p) => ({
      ...p,
      // Dla zdjęć z Vercel Blob (private store) generuj Signed URL
      photoUrl: p.photoUrl?.startsWith("https://") && p.photoUrl.includes(".private.blob.vercel-storage.com")
        ? getDownloadUrl(p.photoUrl)
        : p.photoUrl,
    }));
    const notes = await db.select().from(sessionNotes).where(eq(sessionNotes.workSessionId, data.session.id));

    const resolvedLocation = await CustomerLocationService.resolveForWorkOrder(
      data.session.workOrderId,
      data.session.customerId,
    );

    return {
       session: {
         ...data.session,
         customerAddress: resolvedLocation?.address ?? data.customerAddress,
         customerLat: resolvedLocation?.latitude ?? data.customerLat,
         customerLng: resolvedLocation?.longitude ?? data.customerLng,
         customerFirstName: data.customerFirstName,
         customerLastName: data.customerLastName,
         resourceName: data.resourceName,
         categoryId: data.categoryId,
         categoryName: data.categoryName,
         categoryIsStationary: Boolean(data.categoryIsStationary),
         materialName: data.materialName,
         customerLocationId: resolvedLocation?.id ?? null,
         routeWaypoints: resolvedLocation?.routeWaypoints ?? [],
       },
       events: photos,
       notes: notes,
       settings: companySettingsData,
       user: userData
    };
  }

  /**
   * Tworzy nową sesję pracy (tzw. "z palca" - Wizard).
   * Przyjmuje surowy body (Record<string, unknown>) i samodzielnie parsuje/waliduje pola.
   * Rzuca Error z kodem błędu (np. "missing_fields", "invalid_payload").
   */
  static async createWizardSession(
    userId: number,
    companyId: number,
    body: Record<string, unknown>,
  ) {
    const resourceId = body.resourceId;
    const categoryId = body.categoryId;
    const materialId = body.materialId;
    const customerId = body.customerId;
    const taskDescription = typeof body.taskDescription === "string" ? body.taskDescription : undefined;
    const quantityTons = typeof body.quantityTons === "string" ? body.quantityTons : null;

    const resId = parsePositiveIntParam(resourceId);
    const catId = parsePositiveIntParam(categoryId);
    if (resId == null || catId == null) {
      throw new Error('missing_fields');
    }

    const matId = materialId != null && materialId !== "" ? parsePositiveIntParam(materialId) : null;
    const custId = customerId != null && customerId !== "" ? parsePositiveIntParam(customerId) : null;
    if (materialId != null && materialId !== "" && matId == null) {
      throw new Error('invalid_payload');
    }
    if (customerId != null && customerId !== "" && custId == null) {
      throw new Error('invalid_payload');
    }

    const startCoord = coordsFromRequestBody(body);

    // Sprawdzenie czy już trwa sesja
    const existing = await db
      .select()
      .from(workSessions)
      .where(WorkerSessionService.activeSessionWhere(userId, companyId))
      .limit(1);

    if (existing.length > 0) {
       throw new Error('session_active');
    }

    const resourceBusy = await ScheduleConflictService.hasActiveResourceSession(
      companyId,
      resId,
      userId,
    );
    if (resourceBusy) {
      throw new Error('resource_busy');
    }

    const startNums = startCoord ? coordPairToNumericStrings(startCoord) : null;

    const newSession = await db.insert(workSessions).values({
      companyId,
      userId,
      resourceId: resId,
      categoryId: catId,
      materialId: matId || null,
      customerId: custId || null,
      quantityTons: quantityTons || null,
      taskDescription: taskDescription || null,
      status: 'IN_PROGRESS',
      ...(startNums
        ? {
            startLatitude: startNums.lat,
            startLongitude: startNums.lng,
          }
        : {}),
    }).returning();

    return newSession[0];
  }

  /**
   * Zamyka obecnie aktywną sesję.
   */
  static async endActiveSession(
    userId: number,
    companyId: number,
    endCoord?: { lat: number; lng: number } | null,
  ) {
    const existing = await db
      .select()
      .from(workSessions)
      .where(WorkerSessionService.activeSessionWhere(userId, companyId))
      .limit(1);

    if (existing.length === 0) {
       throw new Error('no_active_session');
    }

    const row = existing[0];
    const sessionId = row.id;
    const endNums = endCoord ? coordPairToNumericStrings(endCoord) : null;

    // Transakcja: UPDATE work_sessions + UPDATE work_orders atomowo
    await db.transaction(async (tx) => {
      await tx.update(workSessions).set({
        status: 'COMPLETED',
        endTime: new Date(),
        ...(endNums
          ? {
              endLatitude: endNums.lat,
              endLongitude: endNums.lng,
            }
          : {}),
      }).where(eq(workSessions.id, sessionId));

      if (row.workOrderId != null) {
        await tx
          .update(workOrders)
          .set({ status: 'COMPLETED' })
          .where(eq(workOrders.id, row.workOrderId));
      }
    });

    return true;
  }
  static async addNote(
    userId: number,
    companyId: number,
    note: string,
    lat?: string | null,
    lng?: string | null,
  ) {
    const existing = await db
      .select()
      .from(workSessions)
      .where(WorkerSessionService.activeSessionWhere(userId, companyId))
      .limit(1);
    if (existing.length === 0) throw new Error('no_active_session');

    await db.insert(sessionNotes).values({
      workSessionId: existing[0].id,
      note,
      latitude: lat || null,
      longitude: lng || null,
    });
  }

  static async updateNote(userId: number, companyId: number, noteId: number, note: string) {
    const existing = await db
      .select()
      .from(workSessions)
      .where(WorkerSessionService.activeSessionWhere(userId, companyId))
      .limit(1);
    if (existing.length === 0) throw new Error('no_active_session');

    const targetNote = await db.select().from(sessionNotes)
      .where(and(eq(sessionNotes.id, noteId), eq(sessionNotes.workSessionId, existing[0].id))).limit(1);
    if (targetNote.length === 0) throw new Error('unauthorized_note');

    await db.update(sessionNotes).set({ note }).where(eq(sessionNotes.id, noteId));
  }

  static async addPhoto(
    userId: number,
    companyId: number,
    photoUrl: string,
    lat?: string | null,
    lng?: string | null,
  ) {
    const existing = await db
      .select()
      .from(workSessions)
      .where(WorkerSessionService.activeSessionWhere(userId, companyId))
      .limit(1);
    if (existing.length === 0) throw new Error('no_active_session');

    await db.insert(sessionPhotos).values({
      workSessionId: existing[0].id,
      photoUrl,
      photoType: 'AD_HOC',
      latitude: lat || null,
      longitude: lng || null,
    });
  }

  static async cancelActiveSession(userId: number, companyId: number) {
    const [session] = await db
      .select()
      .from(workSessions)
      .where(WorkerSessionService.activeSessionWhere(userId, companyId))
      .limit(1);
    if (!session) throw new Error('no_active_session');

    // Transakcja: UPDATE work_orders + DELETE work_sessions atomowo
    await db.transaction(async (tx) => {
      if (session.workOrderId != null) {
        await tx.update(workOrders).set({ status: 'PENDING' }).where(eq(workOrders.id, session.workOrderId));
      }
      await tx.delete(workSessions).where(eq(workSessions.id, session.id));
    });
  }

  /**
   * Pobiera historię zakończonych sesji dla pracownika.
   */
  static async getCompletedSessions(userId: number, companyId: number, limitCount: number = 20) {
    const rows = await db
      .select({
        id: workSessions.id,
        workOrderId: workSessions.workOrderId,
        categoryId: workSessions.categoryId,
        categoryName: resourceCategories.name,
        startTime: workSessions.startTime,
        endTime: workSessions.endTime,
        taskDescription: workSessions.taskDescription,
        quantityTons: workSessions.quantityTons,
        materialName: materials.name,
        customerLastName: customers.lastName,
        resourceName: resources.name,
        hasPhotos: sqlSessionHasPhotos(),
        hasNotes: sqlSessionHasNotes(),
      })
      .from(workSessions)
      .leftJoin(resourceCategories, eq(workSessions.categoryId, resourceCategories.id))
      .leftJoin(resources, eq(workSessions.resourceId, resources.id))
      .leftJoin(materials, eq(workSessions.materialId, materials.id))
      .leftJoin(customers, eq(workSessions.customerId, customers.id))
      .where(
        and(
          eq(workSessions.companyId, companyId),
          eq(workSessions.userId, userId),
          eq(workSessions.status, 'COMPLETED'),
        ),
      )
      .orderBy(desc(workSessions.endTime))
      .limit(limitCount);

    return rows.map((row) => ({
      ...row,
      hasPhotos: Boolean(row.hasPhotos),
      hasNotes: Boolean(row.hasNotes),
    }));
  }

  /**
   * Pobiera pełne szczegóły historycznej sesji (z logami GPS i zdarzeniami) dla widoku historii.
   */
  static async getSessionHistoryFull(sessionId: number, userId: number, companyId: number) {
    const [sessionData] = await db.select({
      id: workSessions.id,
      workOrderId: workSessions.workOrderId,
      categoryId: workSessions.categoryId,
      categoryName: resourceCategories.name,
      categoryIsStationary: resourceCategories.isStationary,
      startTime: workSessions.startTime,
      endTime: workSessions.endTime,
      taskDescription: workSessions.taskDescription,
      quantityTons: workSessions.quantityTons,
      materialName: materials.name,
      resourceName: resources.name,
      customerFirstName: customers.firstName,
      customerLastName: customers.lastName,
      customerAddress: customers.defaultAddress,
      customerLat: customers.latitude,
      customerLng: customers.longitude,
    })
    .from(workSessions)
    .leftJoin(resourceCategories, eq(workSessions.categoryId, resourceCategories.id))
    .leftJoin(resources, eq(workSessions.resourceId, resources.id))
    .leftJoin(materials, eq(workSessions.materialId, materials.id))
    .leftJoin(customers, eq(workSessions.customerId, customers.id))
    .where(
      and(
        eq(workSessions.id, sessionId),
        eq(workSessions.userId, userId),
        eq(workSessions.companyId, companyId),
      ),
    );

    if (!sessionData) return null;

    const [logs, notes, photos] = await Promise.all([
      db.select().from(gpsLogs).where(eq(gpsLogs.workSessionId, sessionId)).orderBy(gpsLogs.timestamp),
      db.select().from(sessionNotes).where(eq(sessionNotes.workSessionId, sessionId)),
      db.select().from(sessionPhotos).where(eq(sessionPhotos.workSessionId, sessionId))
    ]);

    return { sessionData, logs, notes, photos };
  }
}
