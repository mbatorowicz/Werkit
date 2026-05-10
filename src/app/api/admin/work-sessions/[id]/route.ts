import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { JWT_SECRET } from '@/lib/auth';
import { jwtVerify } from 'jose';
import { guardAdminMutation } from '@/lib/requireAdminMutation';
import { AdminSessionService } from '@/services/AdminSessionService';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const token = (await cookies()).get('auth_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await jwtVerify(token, JWT_SECRET);

    const sessionId = parseInt((await context.params).id);
    if (isNaN(sessionId)) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });

    const { logs, photos, notes } = await AdminSessionService.getSessionDetails(sessionId);

    return NextResponse.json({ logs, photos, notes });
  } catch (err: unknown) {
    console.error(err);
    return NextResponse.json({ error: 'fetch_error' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await guardAdminMutation();
  if (denied) return denied;

  try {
    const sessionId = parseInt((await context.params).id, 10);
    if (Number.isNaN(sessionId)) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });

    await AdminSessionService.deleteArchivedSession(sessionId);
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '';
    if (msg === 'not_found') return NextResponse.json({ error: 'not_found' }, { status: 404 });
    if (msg === 'session_still_active') {
      return NextResponse.json({ error: 'session_still_active' }, { status: 409 });
    }
    console.error(e);
    return NextResponse.json({ error: 'delete_error' }, { status: 500 });
  }
}
