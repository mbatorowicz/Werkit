import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { JWT_SECRET } from '@/lib/auth';
import { jwtVerify } from 'jose';
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const token = (await cookies()).get('auth_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await jwtVerify(token, JWT_SECRET);

    const sessionId = parseInt((await context.params).id);
    if (isNaN(sessionId)) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });

    const { AdminSessionService } = await import('@/services/AdminSessionService');
    const { logs, photos, notes } = await AdminSessionService.getSessionDetails(sessionId);

    return NextResponse.json({ logs, photos, notes });
  } catch (err: unknown) {
    console.error(err);
    return NextResponse.json({ error: 'fetch_error' }, { status: 500 });
  }
}
