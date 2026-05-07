import { NextResponse } from 'next/server';
import { db } from '@/db';
import { deviceLogs } from '@/db/schema';
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
    
    const body = await req.json();
    
    // Zapisujemy log do bazy (metadata jako stringowany JSON z obiektu lub string)
    await db.insert(deviceLogs).values({
      userId,
      level: body.level || 'INFO',
      message: body.message || 'Brak wiadomości',
      metadata: body.metadata || null
    });
    
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Błąd dodawania logu z urządzenia:', e);
    return NextResponse.json({ error: 'Failed to insert log' }, { status: 500 });
  }
}
