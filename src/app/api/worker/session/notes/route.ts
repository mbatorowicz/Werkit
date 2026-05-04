import { NextResponse } from 'next/server';
import { db } from '@/db';
import { workSessions, sessionNotes } from '@/db/schema';
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
    const { note, location } = body;
    if (!note) return NextResponse.json({ error: 'Note is required' }, { status: 400 });

    const existing = await db.select().from(workSessions).where(and(eq(workSessions.userId, userId), eq(workSessions.status, 'IN_PROGRESS'))).limit(1);
    if (existing.length === 0) {
       return NextResponse.json({ error: 'No active session' }, { status: 400 });
    }

    await db.insert(sessionNotes).values({
      workSessionId: existing[0].id,
      note: note,
      latitude: location ? location.lat.toString() : null,
      longitude: location ? location.lng.toString() : null,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to add note' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const token = (await cookies()).get('auth_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const verified = await jwtVerify(token, JWT_SECRET);
    const userId = verified.payload.userId as number;

    const body = await request.json();
    const { noteId, note } = body;
    if (!noteId || !note) return NextResponse.json({ error: 'Note ID and content are required' }, { status: 400 });

    const existing = await db.select().from(workSessions).where(and(eq(workSessions.userId, userId), eq(workSessions.status, 'IN_PROGRESS'))).limit(1);
    if (existing.length === 0) {
       return NextResponse.json({ error: 'No active session' }, { status: 400 });
    }

    // Verify note belongs to the active session
    const targetNote = await db.select().from(sessionNotes).where(and(eq(sessionNotes.id, parseInt(noteId)), eq(sessionNotes.workSessionId, existing[0].id))).limit(1);
    if (targetNote.length === 0) {
       return NextResponse.json({ error: 'Note not found or unauthorized' }, { status: 404 });
    }

    await db.update(sessionNotes).set({ note }).where(eq(sessionNotes.id, parseInt(noteId)));

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to update note' }, { status: 500 });
  }
}
