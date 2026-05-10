import { NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { checkScheduleConflict } from '@/lib/schedule';
import { coerceWorkOrderPriority, validateWorkOrderFieldsAgainstCategory } from '@/lib/workOrderCategoryValidation';
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
    const orderId = parseInt(params.id, 10);
    if (Number.isNaN(orderId)) {
      return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
    }
    const body = await request.json();
    const { resourceId, categoryId, materialId, customerId, taskDescription, quantityTons, expectedDurationHours, priority, dueDate, userId: assignedUserId, forceSave } = body;

    const uidNum = parseInt(String(assignedUserId), 10);
    const resIdNum = parseInt(String(resourceId), 10);
    const catIdNum = parseInt(String(categoryId), 10);

    if (!assignedUserId || !resourceId || !categoryId || Number.isNaN(uidNum) || Number.isNaN(resIdNum) || Number.isNaN(catIdNum)) {
      return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
    }

    const { DictionaryService } = await import('@/services/DictionaryService');
    const categoryRow = await DictionaryService.getResourceCategoryById(catIdNum);
    const catCheck = validateWorkOrderFieldsAgainstCategory(categoryRow, {
      customerId,
      materialId,
      quantityTons,
      taskDescription,
    });
    if (catCheck !== 'ok') {
      return NextResponse.json({ error: catCheck }, { status: 400 });
    }

    const prio = coerceWorkOrderPriority(priority);

    if (!forceSave) {
      const conflict = await checkScheduleConflict(
        uidNum,
        resIdNum,
        dueDate ? new Date(dueDate) : null,
        expectedDurationHours ? parseFloat(String(expectedDurationHours)) : null,
        orderId
      );
      if (conflict) {
        return NextResponse.json({ error: conflict }, { status: 409 });
      }
    }

    try {
      await AdminOrderService.updateOrder(orderId, {
        userId: uidNum,
        resourceId: resIdNum,
        categoryId: catIdNum,
        materialId: materialId ? parseInt(String(materialId), 10) : null,
        customerId: customerId ? parseInt(String(customerId), 10) : null,
        taskDescription: taskDescription || null,
        quantityTons: quantityTons ? parseFloat(String(quantityTons)).toString() : null,
        expectedDurationHours: expectedDurationHours ? parseFloat(String(expectedDurationHours)).toString() : null,
        priority: prio,
        dueDate: dueDate ? new Date(dueDate) : null,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '';
      if (msg === 'not_found' || msg === 'not_pending') {
        return NextResponse.json({ error: msg === 'not_pending' ? 'not_pending' : 'not_found' }, { status: 404 });
      }
      throw e;
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error(err);
    return NextResponse.json({ error: 'save_error' }, { status: 500 });
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
