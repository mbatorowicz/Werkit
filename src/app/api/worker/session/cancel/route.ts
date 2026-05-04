import { NextResponse } from 'next/server';
import { db } from '@/db';
import { workSessions, workOrders } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { JWT_SECRET } from '@/lib/auth';
import { jwtVerify } from 'jose';
export async function POST() {
  try {
    const token = (await cookies()).get('auth_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const verified = await jwtVerify(token, JWT_SECRET);
    const userId = verified.payload.userId as number;

    const [session] = await db.select().from(workSessions).where(and(eq(workSessions.userId, userId), eq(workSessions.status, 'IN_PROGRESS'))).limit(1);
    if (!session) return NextResponse.json({ error: 'Brak aktywnej sesji' }, { status: 404 });

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

    // Delete session (cascades logs, photos, notes)
    await db.delete(workSessions).where(eq(workSessions.id, session.id));

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: 'Błąd podczas cofania zlecenia' }, { status: 500 });
  }
}
