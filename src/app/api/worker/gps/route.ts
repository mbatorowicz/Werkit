import { NextResponse } from 'next/server';
import { db } from '@/db';
import { workSessions, gpsLogs } from '@/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { getUserId } from '@/lib/auth';

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const activeSessions = await db.select().from(workSessions).where(and(eq(workSessions.userId, userId), eq(workSessions.status, 'IN_PROGRESS'))).limit(1);
    if (activeSessions.length === 0) return NextResponse.json({ logs: [] });

    const logs = await db.select().from(gpsLogs).where(eq(gpsLogs.workSessionId, activeSessions[0].id)).orderBy(asc(gpsLogs.timestamp));
    return NextResponse.json({ logs: logs.map(l => ({ lat: parseFloat(l.latitude), lng: parseFloat(l.longitude) })) });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch GPS' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    
    // Support both single point and array of points (for offline sync)
    const points = Array.isArray(body) ? body : [body];
    
    if (points.length === 0) return NextResponse.json({ success: true });

    const activeSessions = await db.select().from(workSessions).where(and(eq(workSessions.userId, userId), eq(workSessions.status, 'IN_PROGRESS'))).limit(1);

    if (activeSessions.length === 0) {
      return NextResponse.json({ error: 'No active session to log GPS' }, { status: 400 });
    }

    const valuesToInsert = points
      .filter((p: any) => p.lat && p.lng)
      .map((p: any) => ({
        workSessionId: activeSessions[0].id,
        latitude: p.lat.toString(),
        longitude: p.lng.toString(),
        timestamp: p.timestamp ? new Date(p.timestamp) : new Date(),
      }));

    if (valuesToInsert.length > 0) {
      await db.insert(gpsLogs).values(valuesToInsert);
    }

    return NextResponse.json({ success: true, count: valuesToInsert.length });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to log GPS' }, { status: 500 });
  }
}
