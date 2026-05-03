import { NextResponse } from 'next/server';
import { db } from '@/db';
import { workSessions, resources, materials, customers, sessionPhotos, sessionNotes, companySettings, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'super-secret-fallback');

async function getUserId() {
  const token = (await cookies()).get('auth_token')?.value;
  if (!token) return null;
  try {
    const verified = await jwtVerify(token, JWT_SECRET);
    return verified.payload.userId as number;
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const activeSessions = await db.select({
      session: workSessions,
      customerAddress: customers.defaultAddress,
      customerLat: customers.latitude,
      customerLng: customers.longitude
    }).from(workSessions)
    .leftJoin(customers, eq(workSessions.customerId, customers.id))
    .where(and(eq(workSessions.userId, userId), eq(workSessions.status, 'IN_PROGRESS'))).limit(1);
    
    const settingsRows = await db.select().from(companySettings).limit(1);
    const companySettingsData = settingsRows[0] || null;

    const userRows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const userData = userRows[0] ? { canCreateOwnOrders: userRows[0].canCreateOwnOrders, notificationsEnabled: userRows[0].notificationsEnabled } : null;

    if (activeSessions.length === 0) {
      return NextResponse.json({ session: null, settings: companySettingsData, user: userData });
    }

    const data = activeSessions[0];
    const photos = await db.select().from(sessionPhotos).where(eq(sessionPhotos.workSessionId, activeSessions[0].session.id));
    const notes = await db.select().from(sessionNotes).where(eq(sessionNotes.workSessionId, activeSessions[0].session.id));

    return NextResponse.json({ 
       session: { ...data.session, customerAddress: data.customerAddress, customerLat: data.customerLat, customerLng: data.customerLng }, 
       events: photos,
       notes: notes,
       settings: companySettingsData,
       user: userData
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { resourceId, sessionType, materialId, customerId, taskDescription } = body;

    if (!resourceId || !sessionType) {
       return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
    }

    // check if already active
    const existing = await db.select().from(workSessions).where(and(eq(workSessions.userId, userId), eq(workSessions.status, 'IN_PROGRESS'))).limit(1);
    if (existing.length > 0) {
       return NextResponse.json({ error: 'session_active' }, { status: 400 });
    }

    const newSession = await db.insert(workSessions).values({
      userId,
      resourceId: parseInt(resourceId),
      sessionType,
      materialId: materialId ? parseInt(materialId) : null,
      customerId: customerId ? parseInt(customerId) : null,
      taskDescription: taskDescription || null,
      status: 'IN_PROGRESS',
    }).returning();

    return NextResponse.json({ success: true, session: newSession[0] });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: 'save_error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const existing = await db.select().from(workSessions).where(and(eq(workSessions.userId, userId), eq(workSessions.status, 'IN_PROGRESS'))).limit(1);
    if (existing.length === 0) {
       return NextResponse.json({ error: 'No active session' }, { status: 400 });
    }

    const sessionId = existing[0].id;
    await db.update(workSessions).set({
      status: 'COMPLETED',
      endTime: new Date(),
    }).where(eq(workSessions.id, sessionId));

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to end session' }, { status: 500 });
  }
}
