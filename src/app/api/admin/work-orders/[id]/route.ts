import { NextResponse } from 'next/server';
import { db } from '@/db';
import { workOrders } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getUserId } from '@/lib/auth';
import { checkScheduleConflict } from '@/lib/schedule';

export const dynamic = 'force-dynamic';

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const params = await props.params;
    const orderId = parseInt(params.id);
    const body = await request.json();
    const { resourceId, sessionType, materialId, customerId, taskDescription, quantityTons, expectedDurationHours, priority, dueDate, userId: assignedUserId, forceSave } = body;

    if (!assignedUserId || !resourceId || !sessionType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!forceSave) {
      const conflict = await checkScheduleConflict(
        parseInt(assignedUserId),
        parseInt(resourceId),
        dueDate ? new Date(dueDate) : null,
        expectedDurationHours ? parseFloat(expectedDurationHours) : null,
        orderId
      );
      if (conflict) {
        return NextResponse.json({ error: conflict }, { status: 409 });
      }
    }

    // Update only if status is PENDING. We shouldn't edit IN_PROGRESS or COMPLETED orders this easily
    const existingOrder = await db.select().from(workOrders).where(and(eq(workOrders.id, orderId), eq(workOrders.status, 'PENDING'))).limit(1);

    if (existingOrder.length === 0) {
      return NextResponse.json({ error: 'Order not found or is no longer pending' }, { status: 404 });
    }

    await db.update(workOrders).set({
      userId: parseInt(assignedUserId),
      resourceId: parseInt(resourceId),
      sessionType,
      materialId: materialId ? parseInt(materialId) : null,
      customerId: customerId ? parseInt(customerId) : null,
      taskDescription: taskDescription || null,
      quantityTons: quantityTons ? parseFloat(quantityTons).toString() : null,
      expectedDurationHours: expectedDurationHours ? parseFloat(expectedDurationHours).toString() : null,
      priority: priority || 'NORMAL',
      dueDate: dueDate ? new Date(dueDate) : null,
    }).where(eq(workOrders.id, orderId));

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to update work order' }, { status: 500 });
  }
}
