import { NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { GpsService, GpsPoint } from '@/services/GpsService';

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const logs = await GpsService.getActiveSessionGpsLogs(userId);
    return NextResponse.json({ logs });
  } catch (err: unknown) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch GPS' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    
    // Support both single point and array of points (for offline sync)
    const points: GpsPoint[] = Array.isArray(body) ? body : [body];
    
    if (points.length === 0) return NextResponse.json({ success: true });

    const savedCount = await GpsService.saveGpsLogs(userId, points);

    return NextResponse.json({ success: true, count: savedCount });
  } catch (err: unknown) {
    console.error(err);
    if (err instanceof Error && err.message === 'no_active_session') {
      return NextResponse.json({ error: 'No active session to log GPS' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to log GPS' }, { status: 500 });
  }
}
