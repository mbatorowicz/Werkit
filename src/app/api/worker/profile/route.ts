import { NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
export async function POST(request: Request) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    if (body.notificationsEnabled !== undefined) {
      const { AdminUserService } = await import('@/services/AdminUserService');
      await AdminUserService.updateUser(userId, { notificationsEnabled: body.notificationsEnabled });
    }
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
