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

  const { WorkerOrderService } = await import('@/services/WorkerOrderService');
  const { WorkerSessionService } = await import('@/services/WorkerSessionService');

  const [ordersRaw, sessionDetails] = await Promise.all([
    WorkerOrderService.getPendingOrders(userId),
    WorkerSessionService.getActiveSessionWithDetails(userId)
  ]);

  const orders = ordersRaw.map(o => ({
    ...o,
    dueDate: o.dueDate ? o.dueDate.toISOString() : null,
    createdAt: o.createdAt ? new Date(o.createdAt).toISOString() : new Date().toISOString(),
    expectedDurationHours: o.expectedDurationHours ? parseFloat(o.expectedDurationHours as string) : null,
    quantityTons: o.quantityTons ? parseFloat(o.quantityTons as string) : null,
    customerName: [o.customerName].filter(Boolean).join(' ') || null
  }));

  const initialData: InitialWorkerData = {
    settings: sessionDetails.settings,
    user: sessionDetails.user,
    workOrders: orders,
    session: sessionDetails.session ? {
      ...sessionDetails.session,
      startTime: sessionDetails.session.startTime.toISOString(),
      endTime: sessionDetails.session.endTime ? sessionDetails.session.endTime.toISOString() : undefined,
    } as unknown as import("@/types/worker").Session : null,
    events: sessionDetails.events as any,
    notes: sessionDetails.notes as any
  };

  return <WorkerClient initialData={initialData} />;
}
