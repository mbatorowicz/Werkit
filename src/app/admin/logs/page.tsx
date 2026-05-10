import LogsClient from "./LogsClient";

export const dynamic = 'force-dynamic';

export default async function AdminLogsPage() {
  const { SystemLogService } = await import('@/services/SystemLogService');
  const { AdminUserService } = await import('@/services/AdminUserService');

  const [formattedLogs, allUsers] = await Promise.all([
    SystemLogService.getRecentLogs(500),
    AdminUserService.getWorkers()
  ]);

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
