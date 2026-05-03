import { NextResponse } from 'next/server';
import { db } from '@/db';
import { workOrders, resources, materials, customers, users } from '@/db/schema';
import { eq, and, aliasedTable } from 'drizzle-orm';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'super-secret-fallback');

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const token = (await cookies()).get('auth_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const verified = await jwtVerify(token, JWT_SECRET);
    const userId = verified.payload.userId as number;

    const creator = aliasedTable(users, 'creator');
    const orders = await db.select({
      id: workOrders.id,
      sessionType: workOrders.sessionType,
      taskDescription: workOrders.taskDescription,
      resourceName: resources.name,
      materialName: materials.name,
      customerName: customers.lastName,
      resourceId: workOrders.resourceId,
      materialId: workOrders.materialId,
      customerId: workOrders.customerId,
      creatorName: creator.fullName,
      quantityTons: workOrders.quantityTons,
      expectedDurationHours: workOrders.expectedDurationHours,
      priority: workOrders.priority,
      dueDate: workOrders.dueDate,
      createdAt: workOrders.createdAt
    })
    .from(workOrders)
    .leftJoin(resources, eq(workOrders.resourceId, resources.id))
    .leftJoin(materials, eq(workOrders.materialId, materials.id))
    .leftJoin(customers, eq(workOrders.customerId, customers.id))
    .leftJoin(creator, eq(workOrders.createdById, creator.id))
    .where(and(eq(workOrders.userId, userId), eq(workOrders.status, 'PENDING')));

    return NextResponse.json(orders);
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to fetch work orders' }, { status: 500 });
  }
}
