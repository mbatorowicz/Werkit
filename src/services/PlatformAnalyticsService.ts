import { db } from '@/db';
import {
  companies,
  users,
  workSessions,
  workOrders,
  deviceLogs,
} from '@/db/schema';
import { sql, eq, gte, and, count } from 'drizzle-orm';

export type CompanyUsageRow = {
  companyId: number;
  companyName: string;
  slug: string;
  isActive: boolean;
  userCount: number;
  workerCount: number;
  sessionsLast30Days: number;
  pendingOrders: number;
  deviceLogsLast7Days: number;
};

export class PlatformAnalyticsService {
  static async getCompaniesUsageOverview(): Promise<CompanyUsageRow[]> {
    const allCompanies = await db.select().from(companies).orderBy(companies.id);
    if (allCompanies.length === 0) return [];

    const since30 = new Date();
    since30.setDate(since30.getDate() - 30);
    const since7 = new Date();
    since7.setDate(since7.getDate() - 7);

    const [userCounts, workerCounts, sessionCounts, pendingCounts, logCounts] =
      await Promise.all([
        db
          .select({ companyId: users.companyId, c: count() })
          .from(users)
          .where(sql`${users.companyId} IS NOT NULL`)
          .groupBy(users.companyId),
        db
          .select({ companyId: users.companyId, c: count() })
          .from(users)
          .where(and(eq(users.role, 'worker'), sql`${users.companyId} IS NOT NULL`))
          .groupBy(users.companyId),
        db
          .select({ companyId: workSessions.companyId, c: count() })
          .from(workSessions)
          .where(gte(workSessions.startTime, since30))
          .groupBy(workSessions.companyId),
        db
          .select({ companyId: workOrders.companyId, c: count() })
          .from(workOrders)
          .where(eq(workOrders.status, 'PENDING'))
          .groupBy(workOrders.companyId),
        db
          .select({ companyId: deviceLogs.companyId, c: count() })
          .from(deviceLogs)
          .where(gte(deviceLogs.createdAt, since7))
          .groupBy(deviceLogs.companyId),
      ]);

    const mapCount = (rows: { companyId: number | null; c: number }[]) => {
      const m = new Map<number, number>();
      for (const r of rows) {
        if (r.companyId != null) m.set(r.companyId, Number(r.c));
      }
      return m;
    };

    const usersMap = mapCount(userCounts);
    const workersMap = mapCount(workerCounts);
    const sessionsMap = mapCount(sessionCounts);
    const pendingMap = mapCount(pendingCounts);
    const logsMap = mapCount(logCounts);

    return allCompanies.map((c) => ({
      companyId: c.id,
      companyName: c.name,
      slug: c.slug,
      isActive: c.isActive,
      userCount: usersMap.get(c.id) ?? 0,
      workerCount: workersMap.get(c.id) ?? 0,
      sessionsLast30Days: sessionsMap.get(c.id) ?? 0,
      pendingOrders: pendingMap.get(c.id) ?? 0,
      deviceLogsLast7Days: logsMap.get(c.id) ?? 0,
    }));
  }
}
