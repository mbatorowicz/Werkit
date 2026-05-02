import { NextResponse } from 'next/server';
import { db } from '@/db';
import { workOrders } from '@/db/schema';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'super-secret-fallback');

export async function POST(request: Request) {
  try {
    const token = (await cookies()).get('auth_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const verified = await jwtVerify(token, JWT_SECRET);
    if (verified.payload.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const { userId, resourceId, sessionType, materialId, customerId, taskDescription } = body;

    if (!userId || !resourceId || !sessionType) {
      return NextResponse.json({ error: 'Brak wymaganych danych' }, { status: 400 });
    }

    await db.insert(workOrders).values({
      userId: parseInt(userId),
      resourceId: parseInt(resourceId),
      sessionType,
      materialId: materialId ? parseInt(materialId) : null,
      customerId: customerId ? parseInt(customerId) : null,
      taskDescription: taskDescription || null,
      status: 'PENDING'
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: 'Błąd podczas tworzenia zlecenia' }, { status: 500 });
  }
}
