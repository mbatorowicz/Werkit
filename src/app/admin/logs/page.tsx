import LogsClient from "./LogsClient";
import { getDictionary } from "@/i18n";

export const dynamic = 'force-dynamic';

export default async function AdminLogsPage() {
  const { sidebar, logs } = getDictionary().admin;
  const { SystemLogService } = await import('@/services/SystemLogService');
  const { AdminUserService } = await import('@/services/AdminUserService');

  const [formattedLogs, allUsers] = await Promise.all([
    SystemLogService.getRecentLogs(500),
    AdminUserService.getWorkers()
  ]);

  return (
    <div className="p-6 pb-24 lg:pb-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{sidebar.deviceLogs}</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          {logs.subtitle}
        </p>
      </div>

      <LogsClient initialLogs={formattedLogs} workers={allUsers} />
    </div>
  );
}
