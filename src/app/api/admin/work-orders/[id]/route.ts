import { NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { checkScheduleConflict } from '@/lib/schedule';
import { guardAdminMutation } from '@/lib/requireAdminMutation';
import { AdminOrderService } from '@/services/AdminOrderService';

export const dynamic = 'force-dynamic';

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  const denied = await guardAdminMutation();
  if (denied) return denied;

  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const params = await props.params;
    const orderId = parseInt(params.id);
    const body = await request.json();
    const { resourceId, categoryId, materialId, customerId, taskDescription, quantityTons, expectedDurationHours, priority, dueDate, userId: assignedUserId, forceSave } = body;

    if (!assignedUserId || !resourceId || !categoryId) {
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

    try {
      await AdminOrderService.updateOrder(orderId, {
        userId: parseInt(assignedUserId),
        resourceId: parseInt(resourceId),
        categoryId: parseInt(categoryId),
        materialId: materialId ? parseInt(materialId) : null,
        customerId: customerId ? parseInt(customerId) : null,
        taskDescription: taskDescription || null,
        quantityTons: quantityTons ? parseFloat(quantityTons).toString() : null,
        expectedDurationHours: expectedDurationHours ? parseFloat(expectedDurationHours).toString() : null,
        priority: priority || 'NORMAL',
        dueDate: dueDate ? new Date(dueDate) : null,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '';
      if (msg === 'not_found' || msg === 'not_pending') {
        return NextResponse.json({ error: 'Order not found or is no longer pending' }, { status: 404 });
      }
      throw e;
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to update work order' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, props: { params: Promise<{ id: string }> }) {
  const denied = await guardAdminMutation();
  if (denied) return denied;

  try {
    const params = await props.params;
    const orderId = parseInt(params.id, 10);
    if (Number.isNaN(orderId)) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });

    await AdminOrderService.deleteOrder(orderId);
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '';
    if (msg === 'not_found') return NextResponse.json({ error: 'not_found' }, { status: 404 });
    console.error(e);
    return NextResponse.json({ error: 'delete_error' }, { status: 500 });
  }
}
