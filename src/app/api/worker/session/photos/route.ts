import { NextResponse } from 'next/server';
import { db } from '@/db';
import { workSessions, sessionPhotos } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { JWT_SECRET } from '@/lib/auth';
import { jwtVerify } from 'jose';
export async function POST(request: Request) {
  try {
    const token = (await cookies()).get('auth_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const verified = await jwtVerify(token, JWT_SECRET);
    const userId = verified.payload.userId as number;

    const body = await request.json();
    const { photoUrl, location } = body;
    if (!photoUrl) return NextResponse.json({ error: 'Photo is required' }, { status: 400 });

    const existing = await db.select().from(workSessions).where(and(eq(workSessions.userId, userId), eq(workSessions.status, 'IN_PROGRESS'))).limit(1);
    if (existing.length === 0) {
       return NextResponse.json({ error: 'No active session' }, { status: 400 });
    }

    await db.insert(sessionPhotos).values({
      workSessionId: existing[0].id,
      photoUrl,
      photoType: 'AD_HOC',
      latitude: location ? location.lat : null,
      longitude: location ? location.lng : null
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Photo Error:", err);
    return NextResponse.json({ error: 'Failed to add photo' }, { status: 500 });
  }
}
