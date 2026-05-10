import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import bcrypt from 'bcrypt';
import { desc } from 'drizzle-orm';

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
  try {
    const body = await request.json();
    const { fullName, usernameEmail, password, role, canCreateOwnOrders } = body;

    if(!fullName || !usernameEmail || !password) {
      return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
    }

    const { AdminUserService } = await import('@/services/AdminUserService');
    const hashedPassword = await bcrypt.hash(password, 10);

    await AdminUserService.createUser({
      fullName,
      usernameEmail,
      passwordHash: hashedPassword,
      role,
      canCreateOwnOrders
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Worker register error", err);
    let msg = 'save_error';
    if (typeof err === 'object' && err !== null && 'code' in err && err.code === '23505') msg = 'user_exists';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
