import { NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { WorkerOrderService } from '@/services/WorkerOrderService';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;

    const sessionId = await WorkerOrderService.acceptOrder(userId, parseInt(id));

    return NextResponse.json({ success: true, sessionId });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'order_not_found') {
      return NextResponse.json({ error: 'Zlecenie nie znalezione' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Błąd podczas akceptacji zlecenia' }, { status: 500 });
  }
}
