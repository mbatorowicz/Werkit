import LogsClient from "./LogsClient";
import { getDictionary } from "@/i18n";
import { DEVICE_LOGS_EXPORT_MAX, DEVICE_LOGS_PAGE_LIMIT } from "@/lib/deviceLogLimits";
import { requireServerCompanyId } from '@/lib/serverTenant';

export const dynamic = 'force-dynamic';

export default async function AdminLogsPage() {
  const companyId = await requireServerCompanyId();
  const { sidebar, logs: logsDict } = getDictionary().admin;
  const { SystemLogService } = await import('@/services/SystemLogService');
  const { AdminUserService } = await import('@/services/AdminUserService');

  const [formattedLogs, allUsers] = await Promise.all([
    SystemLogService.getRecentLogs(companyId, DEVICE_LOGS_PAGE_LIMIT),
    AdminUserService.getWorkers(companyId),
  ]);

  return (
    <div className="p-6 pb-24 lg:pb-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{sidebar.deviceLogs}</h1>
      </div>

      <LogsClient
        initialLogs={formattedLogs}
        workers={allUsers}
        logsDict={logsDict}
        exportMaxRows={DEVICE_LOGS_EXPORT_MAX}
      />
    </div>
  );
}
