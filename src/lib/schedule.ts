import { db } from '@/db';
import { workOrders, workSessions } from '@/db/schema';
import { or, and, eq, ne, inArray } from 'drizzle-orm';

export async function checkScheduleConflict(
  userId: number,
  resourceId: number,
  dueDate: Date | null,
  durationHours: number | null,
  excludeOrderId?: number
) {
  if (!dueDate || !durationHours) return null; // No conflict if not scheduled precisely

  const startT = dueDate.getTime();
  const endT = startT + durationHours * 3600000;

  // Fetch pending work orders for this user or resource
  const conditions = [
    eq(workOrders.userId, userId),
    eq(workOrders.resourceId, resourceId)
  ];
  
  let q = db.select().from(workOrders).where(
    and(
      or(...conditions),
      inArray(workOrders.status, ['PENDING'])
    )
  );

  const activeOrders = await q;

  for (const order of activeOrders) {
    if (excludeOrderId && order.id === excludeOrderId) continue;
    if (!order.dueDate || !order.expectedDurationHours) continue;

    const oStart = order.dueDate.getTime();
    const oEnd = oStart + parseFloat(order.expectedDurationHours as any) * 3600000;

    // Check overlap: A1 < B2 AND A2 > B1
    if (startT < oEnd && endT > oStart) {
      if (order.userId === userId) return `Pracownik ma już w tym czasie przypisane zlecenie #${order.id}.`;
      if (order.resourceId === resourceId) return `Maszyna/Pojazd jest już w tym czasie zarezerwowana w zleceniu #${order.id}.`;
    }
  }

  // We should also check active IN_PROGRESS workSessions if they overlap with the past/present
  // But usually scheduling is for the future. For simplicity, checking PENDING orders is the main ERP feature.
  
  return null; // no conflict
}
