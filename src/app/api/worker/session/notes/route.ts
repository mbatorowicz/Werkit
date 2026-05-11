import { NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { parsePositiveIntParam } from '@/lib/parseRouteParams';
import { WorkerSessionService } from '@/services/WorkerSessionService';

export async function POST(request: Request) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { note, location } = body;
    if (!note) return NextResponse.json({ error: 'Note is required' }, { status: 400 });

    await WorkerSessionService.addNote(userId, note, location?.lat?.toString(), location?.lng?.toString());

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error(err);
    if (err instanceof Error && err.message === 'no_active_session') {
      return NextResponse.json({ error: 'No active session' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to add note' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { noteId, note } = body;
    if (!noteId || !note) return NextResponse.json({ error: 'Note ID and content are required' }, { status: 400 });

    const nid = parsePositiveIntParam(noteId);
    if (nid == null) {
      return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
    }

    await WorkerSessionService.updateNote(userId, nid, note);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error(err);
    if (err instanceof Error && err.message === 'no_active_session') {
      return NextResponse.json({ error: 'No active session' }, { status: 400 });
    }
    if (err instanceof Error && err.message === 'unauthorized_note') {
      return NextResponse.json({ error: 'Note not found or unauthorized' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to update note' }, { status: 500 });
  }
}
