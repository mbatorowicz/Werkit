import { NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { WorkerSessionService } from '@/services/WorkerSessionService';

export async function POST(request: Request) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { photoUrl, location } = body;
    if (!photoUrl) return NextResponse.json({ error: 'Photo is required' }, { status: 400 });

    await WorkerSessionService.addPhoto(userId, photoUrl, location?.lat?.toString(), location?.lng?.toString());

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Photo Error:", err);
    if (err instanceof Error && err.message === 'no_active_session') {
      return NextResponse.json({ error: 'No active session' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to add photo' }, { status: 500 });
  }
}
