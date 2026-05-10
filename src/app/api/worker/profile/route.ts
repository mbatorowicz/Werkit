import { NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = (await request.json()) as Record<string, unknown>;
    const { AdminUserService } = await import('@/services/AdminUserService');

    const actor = await AdminUserService.getUserById(userId);
    if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (body.notificationsEnabled !== undefined) {
      const v = body.notificationsEnabled;
      if (typeof v !== 'boolean') {
        return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
      }
      await AdminUserService.updateUser(userId, { notificationsEnabled: v });
    }

    if (body.biometricLoginEnabled !== undefined) {
      const want = body.biometricLoginEnabled;
      if (typeof want !== 'boolean') {
        return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
      }
      if (want) {
        if (actor.role !== 'worker') {
          return NextResponse.json({ error: 'biometric_workers_only' }, { status: 403 });
        }
        const pwd = typeof body.password === 'string' ? body.password : '';
        if (!pwd.trim()) {
          return NextResponse.json({ error: 'biometric_password_required' }, { status: 400 });
        }
        const ok = await AdminUserService.verifyPasswordForUserId(userId, pwd);
        if (!ok) {
          return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 });
        }
        await AdminUserService.updateUser(userId, { biometricLoginEnabled: true });
      } else {
        await AdminUserService.updateUser(userId, { biometricLoginEnabled: false });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
