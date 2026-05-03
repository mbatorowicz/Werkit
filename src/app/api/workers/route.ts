import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import bcrypt from 'bcrypt';
import { desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const allUsers = await db.select({
      id: users.id,
      fullName: users.fullName,
      usernameEmail: users.usernameEmail,
      role: users.role,
      isActive: users.isActive,
      canCreateOwnOrders: users.canCreateOwnOrders,
    }).from(users).orderBy(desc(users.id));
    
    return NextResponse.json(allUsers);
  } catch (err: any) {
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

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.insert(users).values({
      fullName,
      usernameEmail,
      passwordHash: hashedPassword,
      role: role || 'worker',
      isActive: true,
      canCreateOwnOrders: canCreateOwnOrders !== undefined ? canCreateOwnOrders : true,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Worker register error", err);
    let msg = 'save_error';
    if(err.code === '23505') msg = 'user_exists';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
