import { db } from '@/db';
import { deviceLogs, users } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';

export class SystemLogService {
  static async getRecentLogs(companyId: number, limitCount: number = 500) {
    const rawLogs = await db
      .select({
        id: deviceLogs.id,
        userId: deviceLogs.userId,
        level: deviceLogs.level,
        message: deviceLogs.message,
        metadata: deviceLogs.metadata,
        createdAt: deviceLogs.createdAt,
        workerName: users.fullName,
      })
      .from(deviceLogs)
      .leftJoin(users, eq(deviceLogs.userId, users.id))
      .where(eq(deviceLogs.companyId, companyId))
      .orderBy(desc(deviceLogs.createdAt))
      .limit(limitCount);

    return rawLogs.map((l) => ({
      ...l,
      metadata: l.metadata as Record<string, unknown>,
      createdAt: l.createdAt.toISOString(),
    }));
  }

  static async insertLog(
    companyId: number,
    userId: number,
    level: string,
    message: string,
    metadata?: Record<string, unknown> | null,
  ) {
    const safeLevel = (level || 'INFO').slice(0, 20);
    const safeMessage = (message || 'Brak wiadomości').slice(0, 4000);
    await db.insert(deviceLogs).values({
      companyId,
      userId,
      level: safeLevel,
      message: safeMessage,
      metadata: metadata || null,
    });
  }
}
