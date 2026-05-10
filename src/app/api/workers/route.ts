import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { guardAdminMutation } from '@/lib/requireAdminMutation';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { AdminUserService } = await import('@/services/AdminUserService');
    const allUsers = await AdminUserService.getAllUsers();
    
    return NextResponse.json(allUsers);
  } catch (err: unknown) {
    return NextResponse.json({ error: 'fetch_error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const denied = await guardAdminMutation();
  if (denied) return denied;

  try {
    const body = await request.json();
    const { fullName, usernameEmail, password, role, canCreateOwnOrders } = body;

    if(!fullName || !usernameEmail || !password) {
      return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
    }

    const normalizedRole =
      role === 'admin' ? 'admin' : role === 'viewer' ? 'viewer' : 'worker';

    const { AdminUserService } = await import('@/services/AdminUserService');
    const hashedPassword = await bcrypt.hash(password, 10);

    await AdminUserService.createUser({
      fullName,
      usernameEmail,
      passwordHash: hashedPassword,
      role: normalizedRole,
      canCreateOwnOrders:
        normalizedRole === 'worker' ? !!canCreateOwnOrders : false,
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Worker register error", err);
    let msg = 'save_error';
    if (typeof err === 'object' && err !== null && 'code' in err && err.code === '23505') msg = 'user_exists';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
