import { NextResponse } from 'next/server';
import { db } from '@/db';
import { workSessions, users, resources, materials, customers } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

export const dynamic = 'force-dynamic';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'super-secret-fallback');

export async function GET() {
  try {
    const token = (await cookies()).get('auth_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await jwtVerify(token, JWT_SECRET);

    const data = await db.select({
       id: workSessions.id,
       status: workSessions.status,
       sessionType: workSessions.sessionType,
       taskDescription: workSessions.taskDescription,
       startTime: workSessions.startTime,
       endTime: workSessions.endTime,
       workerName: users.fullName,
       resourceName: resources.name,
       materialName: materials.name,
       customerFirstName: customers.firstName,
       customerLastName: customers.lastName
     })
     .from(workSessions)
     .leftJoin(users, eq(workSessions.userId, users.id))
     .leftJoin(resources, eq(workSessions.resourceId, resources.id))
     .leftJoin(materials, eq(workSessions.materialId, materials.id))
     .leftJoin(customers, eq(workSessions.customerId, customers.id))
     .orderBy(desc(workSessions.startTime));

     return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to fetch archive' }, { status: 500 });
  }
}
