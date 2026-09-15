import { db } from "@/db";
import { companies, users, workSessions, workOrders, deviceLogs } from "@/db/schema";
import { sql, eq, gte, and, count, max, isNull } from "drizzle-orm";
import {
  isCompanyLifecycleStatus,
  isCompanyPlanKey,
  type CompanyLifecycleStatus,
  type CompanyPlanKey,
} from "@/lib/companyLifecycle";
import {
  sortCompaniesByLastAdminLogin,
  toIsoTimestamp,
} from "@/lib/platformTenantHealth";

export type CompanyUsageRow = {
  companyId: number;
  companyName: string;
  slug: string;
  isActive: boolean;
  lifecycleStatus: CompanyLifecycleStatus;
  planKey: CompanyPlanKey | null;
  internalNote: string | null;
  userCount: number;
  workerCount: number;
  sessionsLast30Days: number;
  pendingOrders: number;
  deviceLogsLast7Days: number;
  lastAdminLoginAt: string | null;
  lastWorkerLoginAt: string | null;
  activeSessionsNow: number;
  errorLogsLast24h: number;
};

export class PlatformAnalyticsService {
  static async getCompaniesUsageOverview(): Promise<CompanyUsageRow[]> {
    const allCompanies = await db.select().from(companies).orderBy(companies.id);
    if (allCompanies.length === 0) return [];

    const since30 = new Date();
    since30.setDate(since30.getDate() - 30);
    const since7 = new Date();
    since7.setDate(since7.getDate() - 7);
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [
      userCounts,
      workerCounts,
      sessionCounts,
      pendingCounts,
      logCounts,
      adminLogins,
      workerLogins,
      activeSessions,
      errorLogs,
    ] = await Promise.all([
      db
        .select({ companyId: users.companyId, c: count() })
        .from(users)
        .where(sql`${users.companyId} IS NOT NULL`)
        .groupBy(users.companyId),
      db
        .select({ companyId: users.companyId, c: count() })
        .from(users)
        .where(and(eq(users.role, "worker"), sql`${users.companyId} IS NOT NULL`))
        .groupBy(users.companyId),
      db
        .select({ companyId: workSessions.companyId, c: count() })
        .from(workSessions)
        .where(gte(workSessions.startTime, since30))
        .groupBy(workSessions.companyId),
      db
        .select({ companyId: workOrders.companyId, c: count() })
        .from(workOrders)
        .where(eq(workOrders.status, "PENDING"))
        .groupBy(workOrders.companyId),
      db
        .select({ companyId: deviceLogs.companyId, c: count() })
        .from(deviceLogs)
        .where(gte(deviceLogs.createdAt, since7))
        .groupBy(deviceLogs.companyId),
      db
        .select({ companyId: users.companyId, last: max(users.lastLoginAt) })
        .from(users)
        .where(and(eq(users.role, "admin"), sql`${users.companyId} IS NOT NULL`))
        .groupBy(users.companyId),
      db
        .select({ companyId: users.companyId, last: max(users.lastLoginAt) })
        .from(users)
        .where(and(eq(users.role, "worker"), sql`${users.companyId} IS NOT NULL`))
        .groupBy(users.companyId),
      db
        .select({ companyId: workSessions.companyId, c: count() })
        .from(workSessions)
        .where(isNull(workSessions.endTime))
        .groupBy(workSessions.companyId),
      db
        .select({ companyId: deviceLogs.companyId, c: count() })
        .from(deviceLogs)
        .where(and(eq(deviceLogs.level, "ERROR"), gte(deviceLogs.createdAt, since24h)))
        .groupBy(deviceLogs.companyId),
    ]);

    const mapCount = (rows: { companyId: number | null; c: number }[]) => {
      const m = new Map<number, number>();
      for (const r of rows) {
        if (r.companyId != null) m.set(r.companyId, Number(r.c));
      }
      return m;
    };

    const mapLast = (rows: { companyId: number | null; last: Date | string | null }[]) => {
      const m = new Map<number, string | null>();
      for (const r of rows) {
        if (r.companyId != null) m.set(r.companyId, toIsoTimestamp(r.last));
      }
      return m;
    };

    const usersMap = mapCount(userCounts);
    const workersMap = mapCount(workerCounts);
    const sessionsMap = mapCount(sessionCounts);
    const pendingMap = mapCount(pendingCounts);
    const logsMap = mapCount(logCounts);
    const adminLoginMap = mapLast(adminLogins);
    const workerLoginMap = mapLast(workerLogins);
    const activeSessionsMap = mapCount(activeSessions);
    const errorLogsMap = mapCount(errorLogs);

    const rows: CompanyUsageRow[] = allCompanies.map((c) => ({
      companyId: c.id,
      companyName: c.name,
      slug: c.slug,
      isActive: c.isActive,
      lifecycleStatus: isCompanyLifecycleStatus(c.lifecycleStatus) ? c.lifecycleStatus : "active",
      planKey: isCompanyPlanKey(c.planKey) ? c.planKey : null,
      internalNote: c.internalNote ?? null,
      userCount: usersMap.get(c.id) ?? 0,
      workerCount: workersMap.get(c.id) ?? 0,
      sessionsLast30Days: sessionsMap.get(c.id) ?? 0,
      pendingOrders: pendingMap.get(c.id) ?? 0,
      deviceLogsLast7Days: logsMap.get(c.id) ?? 0,
      lastAdminLoginAt: adminLoginMap.get(c.id) ?? null,
      lastWorkerLoginAt: workerLoginMap.get(c.id) ?? null,
      activeSessionsNow: activeSessionsMap.get(c.id) ?? 0,
      errorLogsLast24h: errorLogsMap.get(c.id) ?? 0,
    }));

    return sortCompaniesByLastAdminLogin(rows);
  }
}
