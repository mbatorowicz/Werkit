import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

import { JWT_SECRET } from '@/lib/auth';
import { checkScheduleConflict } from '@/lib/schedule';
import { coerceWorkOrderPriority, validateWorkOrderFieldsAgainstCategory } from '@/lib/workOrderCategoryValidation';
import { AdminOrderService } from '@/services/AdminOrderService';

export async function GET() {
  try {
    const data = await AdminOrderService.getActiveWorkOrders();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'fetch_error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const token = (await cookies()).get('auth_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const verified = await jwtVerify(token, JWT_SECRET);
    if (verified.payload.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const { userId, resourceId, categoryId, materialId, customerId, taskDescription, quantityTons, expectedDurationHours, priority, dueDate, forceSave } = body;

    const uidNum = parseInt(String(userId), 10);
    const resIdNum = parseInt(String(resourceId), 10);
    const catIdNum = parseInt(String(categoryId), 10);

    if (!userId || !resourceId || !categoryId || Number.isNaN(uidNum) || Number.isNaN(resIdNum) || Number.isNaN(catIdNum)) {
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
        expectedDurationHours ? parseFloat(String(expectedDurationHours)) : null
      );
      if (conflict) {
        return NextResponse.json({ error: conflict }, { status: 409 });
      }
    }

    await AdminOrderService.createOrder({
      userId: uidNum,
      resourceId: resIdNum,
      categoryId: catIdNum,
      sessionType: 'MIGRATED', // Keep for now until deleted
      materialId: materialId ? parseInt(String(materialId), 10) : null,
      customerId: customerId ? parseInt(String(customerId), 10) : null,
      taskDescription: taskDescription || null,
      status: 'PENDING',
      quantityTons: quantityTons ? quantityTons.toString() : null,
      expectedDurationHours: expectedDurationHours ? expectedDurationHours.toString() : null,
      priority: prio,
      dueDate: dueDate ? new Date(dueDate) : null,
      createdById: verified.payload.userId as number
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error(err);
    return NextResponse.json({ error: 'save_error' }, { status: 500 });
  }
}
