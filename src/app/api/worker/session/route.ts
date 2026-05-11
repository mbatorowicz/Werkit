import { NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { coordsFromRequestBody } from '@/lib/coordsFromRequestBody';
import { parsePositiveIntParam } from '@/lib/parseRouteParams';
import { WorkerSessionService } from '@/services/WorkerSessionService';

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const sessionData = await WorkerSessionService.getActiveSessionWithDetails(userId);
    return NextResponse.json(sessionData);
  } catch (err: unknown) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { resourceId, categoryId, materialId, customerId, taskDescription, quantityTons } = body;
    const startCoord = coordsFromRequestBody(body);

    const resId = parsePositiveIntParam(resourceId);
    const catId = parsePositiveIntParam(categoryId);
    if (resId == null || catId == null) {
      return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
    }

    const matId = materialId != null && materialId !== '' ? parsePositiveIntParam(materialId) : null;
    const custId = customerId != null && customerId !== '' ? parsePositiveIntParam(customerId) : null;
    if (materialId != null && materialId !== '' && matId == null) {
      return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
    }
    if (customerId != null && customerId !== '' && custId == null) {
      return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
    }

    const newSession = await WorkerSessionService.createWizardSession(userId, {
      resourceId: resId,
      categoryId: catId,
      materialId: matId,
      customerId: custId,
      quantityTons: quantityTons || null,
      taskDescription,
      startCoord,
    });

    return NextResponse.json({ success: true, session: newSession });
  } catch (err: unknown) {
    console.error(err);
    if (err instanceof Error && err.message === 'session_active') {
       return NextResponse.json({ error: 'session_active' }, { status: 400 });
    }
    return NextResponse.json({ error: 'save_error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let body: unknown = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }
    const endCoord = coordsFromRequestBody(body);

    await WorkerSessionService.endActiveSession(userId, endCoord);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error(err);
    if (err instanceof Error && err.message === 'no_active_session') {
       return NextResponse.json({ error: 'No active session' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to end session' }, { status: 500 });
  }
}
