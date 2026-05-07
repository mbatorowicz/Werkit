import { db } from '@/db';
import { workSessions, resources, materials, customers, sessionPhotos, sessionNotes, companySettings, users, workOrders } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export class WorkerSessionService {
  /**
   * Pobiera aktualną, aktywną sesję pracownika wraz ze zdjęciami, notatkami, ustawieniami firmy i danymi usera.
   */
  static async getActiveSessionWithDetails(userId: number) {
    const activeSessions = await db.select({
      session: workSessions,
      customerAddress: customers.defaultAddress,
      customerLat: customers.latitude,
      customerLng: customers.longitude,
      customerFirstName: customers.firstName,
      customerLastName: customers.lastName,
      resourceName: resources.name,
      materialName: materials.name
    }).from(workSessions)
    .leftJoin(customers, eq(workSessions.customerId, customers.id))
    .leftJoin(resources, eq(workSessions.resourceId, resources.id))
    .leftJoin(materials, eq(workSessions.materialId, materials.id))
    .where(and(eq(workSessions.userId, userId), eq(workSessions.status, 'IN_PROGRESS'))).limit(1);
    
    const settingsRows = await db.select().from(companySettings).limit(1);
    const companySettingsData = settingsRows[0] || null;

    const userRows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const userData = userRows[0] ? { 
      canCreateOwnOrders: userRows[0].canCreateOwnOrders, 
      notificationsEnabled: userRows[0].notificationsEnabled 
    } : null;

    if (activeSessions.length === 0) {
      return { session: null, settings: companySettingsData, user: userData, events: [], notes: [] };
    }

    const data = activeSessions[0];
    const photos = await db.select().from(sessionPhotos).where(eq(sessionPhotos.workSessionId, data.session.id));
    const notes = await db.select().from(sessionNotes).where(eq(sessionNotes.workSessionId, data.session.id));

    return { 
       session: { 
         ...data.session, 
         customerAddress: data.customerAddress, 
         customerLat: data.customerLat, 
         customerLng: data.customerLng, 
         customerFirstName: data.customerFirstName, 
         customerLastName: data.customerLastName, 
         resourceName: data.resourceName, 
         materialName: data.materialName 
       }, 
       events: photos,
       notes: notes,
       settings: companySettingsData,
       user: userData
    };
  }

  /**
   * Tworzy nową sesję pracy (tzw. "z palca" - Wizard).
   */
  static async createWizardSession(userId: number, payload: {
    resourceId: number;
    sessionType: string;
    materialId?: number | null;
    customerId?: number | null;
    taskDescription?: string | null;
  }) {
    // Sprawdzenie czy już trwa sesja
    const existing = await db.select().from(workSessions)
      .where(and(eq(workSessions.userId, userId), eq(workSessions.status, 'IN_PROGRESS'))).limit(1);
    
    if (existing.length > 0) {
       throw new Error('session_active');
    }

    const newSession = await db.insert(workSessions).values({
      userId,
      resourceId: payload.resourceId,
      sessionType: payload.sessionType,
      materialId: payload.materialId || null,
      customerId: payload.customerId || null,
      taskDescription: payload.taskDescription || null,
      status: 'IN_PROGRESS',
    }).returning();

    return newSession[0];
  }

  /**
   * Zamyka obecnie aktywną sesję.
   */
  static async endActiveSession(userId: number) {
    const existing = await db.select().from(workSessions)
      .where(and(eq(workSessions.userId, userId), eq(workSessions.status, 'IN_PROGRESS'))).limit(1);
    
    if (existing.length === 0) {
       throw new Error('no_active_session');
    }

    const sessionId = existing[0].id;
    await db.update(workSessions).set({
      status: 'COMPLETED',
      endTime: new Date(),
    }).where(eq(workSessions.id, sessionId));

    return true;
  }
  static async addNote(userId: number, note: string, lat?: string | null, lng?: string | null) {
    const existing = await db.select().from(workSessions)
      .where(and(eq(workSessions.userId, userId), eq(workSessions.status, 'IN_PROGRESS'))).limit(1);
    if (existing.length === 0) throw new Error('no_active_session');

    await db.insert(sessionNotes).values({
      workSessionId: existing[0].id,
      note,
      latitude: lat || null,
      longitude: lng || null,
    });
  }

  static async updateNote(userId: number, noteId: number, note: string) {
    const existing = await db.select().from(workSessions)
      .where(and(eq(workSessions.userId, userId), eq(workSessions.status, 'IN_PROGRESS'))).limit(1);
    if (existing.length === 0) throw new Error('no_active_session');

    const targetNote = await db.select().from(sessionNotes)
      .where(and(eq(sessionNotes.id, noteId), eq(sessionNotes.workSessionId, existing[0].id))).limit(1);
    if (targetNote.length === 0) throw new Error('unauthorized_note');

    await db.update(sessionNotes).set({ note }).where(eq(sessionNotes.id, noteId));
  }

  static async addPhoto(userId: number, photoUrl: string, lat?: string | null, lng?: string | null) {
    const existing = await db.select().from(workSessions)
      .where(and(eq(workSessions.userId, userId), eq(workSessions.status, 'IN_PROGRESS'))).limit(1);
    if (existing.length === 0) throw new Error('no_active_session');

    await db.insert(sessionPhotos).values({
      workSessionId: existing[0].id,
      photoUrl,
      photoType: 'AD_HOC',
      latitude: lat || null,
      longitude: lng || null,
    });
  }

  static async cancelActiveSession(userId: number) {
    const [session] = await db.select().from(workSessions)
      .where(and(eq(workSessions.userId, userId), eq(workSessions.status, 'IN_PROGRESS'))).limit(1);
    if (!session) throw new Error('no_active_session');

    // Restore the linked work order if it was created from one.
    // We look for the most recently COMPLETED order for this user with matching resource and type.
    const [order] = await db.select().from(workOrders)
      .where(and(
        eq(workOrders.userId, userId),
        eq(workOrders.status, 'COMPLETED'),
        eq(workOrders.resourceId, session.resourceId),
        eq(workOrders.sessionType, session.sessionType)
      ))
      .orderBy(desc(workOrders.id))
      .limit(1);

    if (order) {
      await db.update(workOrders).set({ status: 'PENDING' }).where(eq(workOrders.id, order.id));
    }
    await db.delete(workSessions).where(eq(workSessions.id, session.id));
  }
}
