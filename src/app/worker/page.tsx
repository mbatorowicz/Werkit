import WorkerClient from "./WorkerClient";
import { db } from "@/db";
import { workSessions, customers, sessionPhotos, sessionNotes, companySettings, users, workOrders, resources, materials } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'super-secret-fallback');

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

  // Fetch work orders
  const ordersRaw = await db.select({
    id: workOrders.id,
    sessionType: workOrders.sessionType,
    taskDescription: workOrders.taskDescription,
    resourceName: resources.name,
    materialName: materials.name,
    customerFirstName: customers.firstName,
    customerLastName: customers.lastName,
    priority: workOrders.priority,
    dueDate: workOrders.dueDate,
  }).from(workOrders)
    .leftJoin(resources, eq(workOrders.resourceId, resources.id))
    .leftJoin(materials, eq(workOrders.materialId, materials.id))
    .leftJoin(customers, eq(workOrders.customerId, customers.id))
    .where(and(eq(workOrders.userId, userId), eq(workOrders.status, 'PENDING')));

  const orders = ordersRaw.map(o => ({
    ...o,
    customerName: [o.customerFirstName, o.customerLastName].filter(Boolean).join(' ') || null
  }));

  const initialData: any = {
    settings,
    user: userData,
    workOrders: orders,
    session: null,
    events: [],
    notes: []
  };

  if (activeSessions.length > 0) {
    const data = activeSessions[0];
    initialData.session = { ...data.session, customerAddress: data.customerAddress, customerLat: data.customerLat, customerLng: data.customerLng };
    initialData.events = await db.select().from(sessionPhotos).where(eq(sessionPhotos.workSessionId, data.session.id));
    initialData.notes = await db.select().from(sessionNotes).where(eq(sessionNotes.workSessionId, data.session.id));
  }

  return <WorkerClient initialData={initialData} />;
}
