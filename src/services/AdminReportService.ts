import { db } from '@/db';
import { workSessions, users, resources, workOrders } from '@/db/schema';
import { eq, desc, and, gte } from 'drizzle-orm';

export class AdminReportService {
  static async getActiveSessions() {
    return await db.select({
      id: workSessions.id,
      type: workSessions.sessionType,
      desc: workSessions.taskDescription,
      startTime: workSessions.startTime,
      userId: workSessions.userId,
      userName: users.fullName,
      resourceName: resources.name,
      tons: workSessions.quantityTons,
    })
      .from(workSessions)
      .leftJoin(users, eq(workSessions.userId, users.id))
      .leftJoin(resources, eq(workSessions.resourceId, resources.id))
      .where(eq(workSessions.status, "IN_PROGRESS"))
      .orderBy(desc(workSessions.startTime));
  }

  static async getPendingOrders() {
    return await db.select({
      userId: workOrders.userId
    })
      .from(workOrders)
      .where(eq(workOrders.status, "PENDING"));
  }

  static async getMonthSessions(firstDayOfMonth: Date) {
    return await db.select({
      id: workSessions.id,
      tons: workSessions.quantityTons,
      resourceName: resources.name
    })
    .from(workSessions)
    .leftJoin(resources, eq(workSessions.resourceId, resources.id))
    .where(and(eq(workSessions.status, 'COMPLETED'), gte(workSessions.startTime, firstDayOfMonth)));
  }
}
