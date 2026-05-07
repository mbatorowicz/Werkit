import { db } from "@/db";
import { deviceLogs, users } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import LogsClient from "./LogsClient";

export const dynamic = 'force-dynamic';

export default async function AdminLogsPage() {
  // Pobieramy 500 ostatnich logów
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
  .limit(500);

  // Mapowanie dat na iso string
  const formattedLogs = rawLogs.map(l => ({
    ...l,
    metadata: l.metadata as Record<string, unknown>,
    createdAt: l.createdAt.toISOString(),
  }));

  const allUsers = await db.select({ id: users.id, fullName: users.fullName }).from(users).where(eq(users.role, 'worker'));

  return (
    <div className="p-6 pb-24 lg:pb-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Logi Urządzeń (Terminal)</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Monitoruj na żywo błędy i zachowania aplikacji pracowniczych w terenie.
        </p>
      </div>

      <LogsClient initialLogs={formattedLogs} workers={allUsers} />
    </div>
  );
}
