import { db } from '@/db';
import {
  workSessions,
  users,
  resources,
  workOrders,
  companySettings,
  resourceCategories,
} from '@/db/schema';
import { eq, desc, and, gte, lt } from 'drizzle-orm';
import type { ReportsDashboardSnapshot, ReportActiveSessionRow } from '@/types/admin';

export class AdminReportService {
  /**
   * Kompletny zestaw metryk pod stronę Raporty — jedna transakcja logiczna z punktu widzenia UI.
   */
  static async getDashboardSnapshot(referenceDate = new Date()): Promise<ReportsDashboardSnapshot> {
    const y = referenceDate.getFullYear();
    const m = referenceDate.getMonth();
    const monthStart = new Date(y, m, 1);
    const monthEndExclusive = new Date(y, m + 1, 1);
    const prevMonthStart = new Date(y, m - 1, 1);

    const [settingsRow, activeSessions, pendingRows, monthSessions, prevMonthSessions] =
      await Promise.all([
        db.select().from(companySettings).limit(1),
        AdminReportService.fetchActiveSessionsRows(),
        AdminReportService.fetchPendingOrderUserIds(),
        AdminReportService.fetchCompletedSessionsBetween(monthStart, monthEndExclusive),
        AdminReportService.fetchCompletedSessionsBetween(prevMonthStart, monthStart),
      ]);

    const settings = settingsRow[0] ?? null;
    const mapLat = settings?.baseLatitude ? parseFloat(settings.baseLatitude) : 52.401;
    const mapLng = settings?.baseLongitude ? parseFloat(settings.baseLongitude) : 22.015;

    const workersActiveNow = new Set(activeSessions.map((s) => s.userId)).size;
    const workersWithPendingOrders = new Set(pendingRows.map((p) => p.userId)).size;

    const categoryBuckets = new Map<string | null, number>();
    for (const s of activeSessions) {
      const key = s.categoryName?.trim() ? s.categoryName : null;
      categoryBuckets.set(key, (categoryBuckets.get(key) ?? 0) + 1);
    }
    const activeSessionsByCategory = [...categoryBuckets.entries()]
      .map(([categoryName, count]) => ({ categoryName, count }))
      .sort((a, b) => b.count - a.count);

    const machineStats: Record<string, number> = {};
    let tonsThisMonth = 0;
    for (const row of monthSessions) {
      tonsThisMonth += row.tons ? parseFloat(row.tons as string) : 0;
      if (row.resourceName) {
        machineStats[row.resourceName] = (machineStats[row.resourceName] ?? 0) + 1;
      }
    }

    const topMachinesThisMonth = Object.entries(machineStats)
      .map(([name, sessionCount]) => ({ name, sessionCount }))
      .sort((a, b) => b.sessionCount - a.sessionCount)
      .slice(0, 6);

    const completedThis = monthSessions.length;
    const completedPrev = prevMonthSessions.length;
    let monthOverMonthPercent: number | null = null;
    if (completedPrev > 0) {
      monthOverMonthPercent = Math.round(((completedThis - completedPrev) / completedPrev) * 100);
    } else if (completedThis > 0) {
      monthOverMonthPercent = 100;
    }

    return {
      generatedAt: referenceDate.toISOString(),
      companyName: settings?.companyName ?? null,
      companyCity: settings?.city ?? null,
      mapLat,
      mapLng,
      pendingOrdersTotal: pendingRows.length,
      workersWithPendingOrders,
      workersActiveNow,
      activeSessions,
      activeSessionsByCategory,
      completedSessionsThisMonth: completedThis,
      completedSessionsPrevMonth: completedPrev,
      monthOverMonthPercent,
      tonsThisMonth,
      topMachinesThisMonth,
    };
  }

  private static async fetchActiveSessionsRows(): Promise<ReportActiveSessionRow[]> {
    const rows = await db
      .select({
        id: workSessions.id,
        sessionType: workSessions.sessionType,
        categoryName: resourceCategories.name,
        taskDescription: workSessions.taskDescription,
        startTime: workSessions.startTime,
        userId: workSessions.userId,
        userName: users.fullName,
        resourceName: resources.name,
        quantityTons: workSessions.quantityTons,
      })
      .from(workSessions)
      .leftJoin(users, eq(workSessions.userId, users.id))
      .leftJoin(resources, eq(workSessions.resourceId, resources.id))
      .leftJoin(resourceCategories, eq(workSessions.categoryId, resourceCategories.id))
      .where(eq(workSessions.status, 'IN_PROGRESS'))
      .orderBy(desc(workSessions.startTime));

    return rows.map((r) => ({
      id: r.id,
      sessionType: r.sessionType,
      categoryName: r.categoryName ?? null,
      taskDescription: r.taskDescription ?? null,
      startTime: r.startTime,
      userId: r.userId,
      userName: r.userName ?? null,
      resourceName: r.resourceName ?? null,
      quantityTons: r.quantityTons ?? null,
    }));
  }

  private static async fetchPendingOrderUserIds(): Promise<{ userId: number }[]> {
    return db
      .select({ userId: workOrders.userId })
      .from(workOrders)
      .where(eq(workOrders.status, 'PENDING'));
  }

  private static async fetchCompletedSessionsBetween(start: Date, endExclusive: Date) {
    return db
      .select({
        id: workSessions.id,
        tons: workSessions.quantityTons,
        resourceName: resources.name,
      })
      .from(workSessions)
      .leftJoin(resources, eq(workSessions.resourceId, resources.id))
      .where(
        and(
          eq(workSessions.status, 'COMPLETED'),
          gte(workSessions.startTime, start),
          lt(workSessions.startTime, endExclusive),
        ),
      );
  }
}
