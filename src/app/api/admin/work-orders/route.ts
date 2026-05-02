import { NextResponse } from 'next/server';
import { db } from '@/db';
import { workOrders, users, resources, materials, customers } from '@/db/schema';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { eq, desc, aliasedTable } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'super-secret-fallback');

export async function GET() {
  try {
    const creator = aliasedTable(users, 'creator');

    const data = await db.select({
      id: workOrders.id,
      status: workOrders.status,
      sessionType: workOrders.sessionType,
      taskDescription: workOrders.taskDescription,
      createdAt: workOrders.createdAt,
      workerName: users.fullName,
      creatorName: creator.fullName,
      resourceName: resources.name,
      materialName: materials.name,
      customerFirstName: customers.firstName,
      customerLastName: customers.lastName,
      quantityTons: workOrders.quantityTons,
      priority: workOrders.priority,
      expectedDurationHours: workOrders.expectedDurationHours,
      dueDate: workOrders.dueDate
    })
      .from(workOrders)
      .leftJoin(users, eq(workOrders.userId, users.id))
      .leftJoin(creator, eq(workOrders.createdById, creator.id))
      .leftJoin(resources, eq(workOrders.resourceId, resources.id))
      .leftJoin(materials, eq(workOrders.materialId, materials.id))
      .leftJoin(customers, eq(workOrders.customerId, customers.id))
      .orderBy(desc(workOrders.createdAt));

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: 'fetch_error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const token = (await cookies()).get('auth_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const verified = await jwtVerify(token, JWT_SECRET);
    if (verified.payload.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const { userId, resourceId, sessionType, materialId, customerId, taskDescription, quantityTons, expectedDurationHours, priority, dueDate } = body;

    if (!userId || !resourceId || !sessionType) {
      return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
    }

    await db.insert(workOrders).values({
      userId: parseInt(userId),
      resourceId: parseInt(resourceId),
      sessionType,
      materialId: materialId ? parseInt(materialId) : null,
      customerId: customerId ? parseInt(customerId) : null,
      taskDescription: taskDescription || null,
      status: 'PENDING',
      quantityTons: quantityTons ? quantityTons.toString() : null,
      expectedDurationHours: expectedDurationHours ? expectedDurationHours.toString() : null,
      priority: priority || 'NORMAL',
      dueDate: dueDate ? new Date(dueDate) : null,
      createdById: verified.payload.userId as number
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: 'save_error' }, { status: 500 });
  }
}
