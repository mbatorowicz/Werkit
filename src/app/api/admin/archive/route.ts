import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

export const dynamic = 'force-dynamic';

import { JWT_SECRET } from '@/lib/auth';
import { AdminOrderService } from '@/services/AdminOrderService';

export async function GET() {
  try {
    const token = (await cookies()).get('auth_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await jwtVerify(token, JWT_SECRET);

    const data = await AdminOrderService.getArchivedSessions();

    return NextResponse.json(data);
  } catch (err: unknown) {
    return NextResponse.json({ error: 'fetch_error' }, { status: 500 });
  }
}
