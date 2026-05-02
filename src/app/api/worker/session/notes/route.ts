import { NextResponse } from 'next/server';
import { db } from '@/db';
import { workSessions } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'super-secret-fallback');

export async function POST(request: Request) {
  try {
    const token = (await cookies()).get('auth_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const verified = await jwtVerify(token, JWT_SECRET);
    const userId = verified.payload.userId as number;

    const body = await request.json();
    const { note } = body;
    if (!note) return NextResponse.json({ error: 'Note is required' }, { status: 400 });

    const existing = await db.select().from(workSessions).where(and(eq(workSessions.userId, userId), eq(workSessions.status, 'IN_PROGRESS'))).limit(1);
    if (existing.length === 0) {
       return NextResponse.json({ error: 'No active session' }, { status: 400 });
    }

    const currentDesc = existing[0].taskDescription || '';
    const newDesc = currentDesc ? `${currentDesc}\n\n[Dodatkowa notatka]: ${note}` : `[Notatka]: ${note}`;

    await db.update(workSessions).set({ taskDescription: newDesc }).where(eq(workSessions.id, existing[0].id));

    return NextResponse.json({ success: true, newDesc });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to add note' }, { status: 500 });
  }
}
