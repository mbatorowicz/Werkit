import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { JWT_SECRET } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const token = (await cookies()).get('auth_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const verified = await jwtVerify(token, JWT_SECRET);
    const userId = verified.payload.userId as number;
    
    const body = (await req.json()) as Record<string, unknown>;
    const level = typeof body.level === 'string' ? body.level : 'INFO';
    const message = typeof body.message === 'string' ? body.message : 'Brak wiadomości';
    let metadata: Record<string, unknown> | null | undefined;
    if (!('metadata' in body)) metadata = undefined;
    else if (body.metadata === null) metadata = null;
    else if (typeof body.metadata === 'object' && body.metadata !== null && !Array.isArray(body.metadata)) {
      metadata = body.metadata as Record<string, unknown>;
    } else {
      metadata = undefined;
    }

    const { SystemLogService } = await import('@/services/SystemLogService');
    await SystemLogService.insertLog(userId, level, message, metadata);
    
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Błąd dodawania logu z urządzenia:', e);
    return NextResponse.json({ error: 'Failed to insert log' }, { status: 500 });
  }
}
