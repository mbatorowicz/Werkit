import { NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { WorkerSessionService } from '@/services/WorkerSessionService';

export async function POST(request: Request) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await WorkerSessionService.cancelActiveSession(userId);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error(err);
    if (err instanceof Error && err.message === 'no_active_session') {
      return NextResponse.json({ error: 'Brak aktywnej sesji' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Błąd podczas cofania zlecenia' }, { status: 500 });
  }
}
