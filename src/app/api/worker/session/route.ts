import { NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { coordsFromRequestBody } from '@/lib/coordsFromRequestBody';
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

    if (!resourceId || !categoryId) {
       return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
    }

    const newSession = await WorkerSessionService.createWizardSession(userId, {
      resourceId: parseInt(resourceId),
      categoryId: parseInt(categoryId),
      materialId: materialId ? parseInt(materialId) : null,
      customerId: customerId ? parseInt(customerId) : null,
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
