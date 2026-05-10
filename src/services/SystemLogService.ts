import { db } from '@/db';
import { deviceLogs, users } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';

export class SystemLogService {
  static async getRecentLogs(limitCount: number = 500) {
    const rawLogs = await db.select({
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
    .orderBy(desc(deviceLogs.createdAt))
    .limit(limitCount);

    return rawLogs.map(l => ({
      ...l,
      metadata: l.metadata as Record<string, unknown>,
      createdAt: l.createdAt.toISOString(),
    }));
  }
}
