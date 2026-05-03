import { NextResponse } from 'next/server';
import { db } from '@/db';
import { workOrders, workSessions } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'super-secret-fallback');

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = (await cookies()).get('auth_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const verified = await jwtVerify(token, JWT_SECRET);
    const userId = verified.payload.userId as number;
    const { id } = await params;

    const [order] = await db.select().from(workOrders).where(and(eq(workOrders.id, parseInt(id)), eq(workOrders.userId, userId)));
    if (!order) return NextResponse.json({ error: 'Zlecenie nie znalezione' }, { status: 404 });

    // Mark as completed
    await db.update(workOrders).set({ status: 'COMPLETED' }).where(eq(workOrders.id, order.id));

    // Create session
    const [newSession] = await db.insert(workSessions).values({
      userId: userId,
      sessionType: order.sessionType,
      resourceId: order.resourceId,
      materialId: order.materialId,
      customerId: order.customerId,
      taskDescription: order.taskDescription,
      quantityTons: order.quantityTons,
      expectedDurationHours: order.expectedDurationHours,
      dueDate: order.dueDate,
      status: 'IN_PROGRESS'
    }).returning();

    return NextResponse.json({ success: true, sessionId: newSession.id });
  } catch (err: any) {
    return NextResponse.json({ error: 'Błąd podczas akceptacji zlecenia' }, { status: 500 });
  }
}
