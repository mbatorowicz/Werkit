import { NextResponse } from 'next/server';
import { db } from '@/db';
import { workSessions, gpsLogs, sessionPhotos } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'super-secret-fallback');

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const token = (await cookies()).get('auth_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await jwtVerify(token, JWT_SECRET);

    const sessionId = parseInt((await context.params).id);
    if (isNaN(sessionId)) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });

    const [logs, photos] = await Promise.all([
      db.select().from(gpsLogs).where(eq(gpsLogs.workSessionId, sessionId)).orderBy(desc(gpsLogs.timestamp)),
      db.select().from(sessionPhotos).where(eq(sessionPhotos.workSessionId, sessionId)).orderBy(desc(sessionPhotos.createdAt))
    ]);

    return NextResponse.json({ logs, photos });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: 'fetch_error' }, { status: 500 });
  }
}
