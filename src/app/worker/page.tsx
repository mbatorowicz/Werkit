import WorkerClient from "./WorkerClient";
import { InitialWorkerData } from "@/types/worker";
import { db } from "@/db";
import { workSessions, customers, sessionPhotos, sessionNotes, companySettings, users, workOrders, resources, materials } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

import { JWT_SECRET } from '@/lib/auth';
export const dynamic = 'force-dynamic';

async function getUserId() {
  const token = (await cookies()).get('auth_token')?.value;
  if (!token) return null;
  try {
    const verified = await jwtVerify(token, JWT_SECRET);
    return verified.payload.userId as number;
  } catch {
    return null;
  }
}

export default async function WorkerPage() {
  const userId = await getUserId();
  if (!userId) {
    return <WorkerClient initialData={null} />;
  }

  // Fetch session
  const activeSessions = await db.select({
    session: workSessions,
    customerAddress: customers.defaultAddress,
    customerLat: customers.latitude,
    customerLng: customers.longitude
  }).from(workSessions)
  .leftJoin(customers, eq(workSessions.customerId, customers.id))
  .where(and(eq(workSessions.userId, userId), eq(workSessions.status, 'IN_PROGRESS'))).limit(1);

  // Fetch settings
  const settingsRows = await db.select().from(companySettings).limit(1);
  const settings = settingsRows[0] || null;

  // Fetch user
  const userRows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const userData = userRows[0] ? { canCreateOwnOrders: userRows[0].canCreateOwnOrders, notificationsEnabled: userRows[0].notificationsEnabled } : null;

  // Fetch work orders using Service
  const { WorkerOrderService } = await import('@/services/WorkerOrderService');
  const ordersRaw = await WorkerOrderService.getPendingOrders(userId);

  const orders = ordersRaw.map(o => ({
    ...o,
    dueDate: o.dueDate ? o.dueDate.toISOString() : null,
    createdAt: o.createdAt ? new Date(o.createdAt).toISOString() : new Date().toISOString(),
    expectedDurationHours: o.expectedDurationHours ? parseFloat(o.expectedDurationHours as string) : null,
    quantityTons: o.quantityTons ? parseFloat(o.quantityTons as string) : null,
    customerName: [o.customerName].filter(Boolean).join(' ') || null
  }));

  const initialData: InitialWorkerData = {
    settings,
    user: userData,
    workOrders: orders,
    session: null,
    events: [],
    notes: []
  };

  if (activeSessions.length > 0) {
    const data = activeSessions[0];
    initialData.session = { 
      ...data.session, 
      startTime: data.session.startTime.toISOString(), 
      endTime: data.session.endTime ? data.session.endTime.toISOString() : undefined,
      customerAddress: data.customerAddress, 
      customerLat: data.customerLat, 
      customerLng: data.customerLng, 
      customerFirstName: null, 
      customerLastName: null, 
      resourceName: null, 
      materialName: null, 
      quantityTons: null 
    } as unknown as import("@/types/worker").Session;
    initialData.events = await db.select().from(sessionPhotos).where(eq(sessionPhotos.workSessionId, data.session.id));
    initialData.notes = await db.select().from(sessionNotes).where(eq(sessionNotes.workSessionId, data.session.id));
  }

  return <WorkerClient initialData={initialData} />;
}
