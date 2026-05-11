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
    const rawLevel = typeof body.level === 'string' ? body.level.trim().toUpperCase() : 'INFO';
    const allowed = new Set(['INFO', 'WARN', 'ERROR', 'DEBUG']);
    const level = allowed.has(rawLevel) ? rawLevel : 'INFO';
    const rawMsg = typeof body.message === 'string' ? body.message : 'Brak wiadomości';
    const message = rawMsg.length > 4000 ? rawMsg.slice(0, 4000) : rawMsg;
    let metadata: Record<string, unknown> | null | undefined;
    if (!('metadata' in body)) metadata = undefined;
    else if (body.metadata === null) metadata = null;
    else if (typeof body.metadata === 'object' && body.metadata !== null && !Array.isArray(body.metadata)) {
      metadata = body.metadata as Record<string, unknown>;
      try {
        if (JSON.stringify(metadata).length > 24000) {
          metadata = { truncated: true, reason: 'metadata_too_large' };
        }
      } catch {
        metadata = { truncated: true, reason: 'metadata_not_serializable' };
      }
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
