import { NextResponse } from 'next/server';
import { guardAdminMutation } from '@/lib/requireAdminMutation';
import { AdminSessionService } from '@/services/AdminSessionService';

export const dynamic = 'force-dynamic';

export async function POST(_request: Request, props: { params: Promise<{ id: string }> }) {
  const denied = await guardAdminMutation();
  if (denied) return denied;

  try {
    const params = await props.params;
    const sessionId = parseInt(params.id, 10);
    if (Number.isNaN(sessionId)) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });

    await AdminSessionService.forceCompleteSession(sessionId);
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '';
    if (msg === 'not_found') return NextResponse.json({ error: 'not_found' }, { status: 404 });
    if (msg === 'not_in_progress') return NextResponse.json({ error: 'not_in_progress' }, { status: 409 });
    console.error(e);
    return NextResponse.json({ error: 'save_error' }, { status: 500 });
  }
}
