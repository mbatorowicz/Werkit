import LogsClient from "./LogsClient";
import { getDictionary } from "@/i18n";
import { formatDict } from "@/i18n/format";
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

  const scopeNote = formatDict(logsDict.scopeNote, {
    page: DEVICE_LOGS_PAGE_LIMIT,
    exportMax: DEVICE_LOGS_EXPORT_MAX,
  });

  return (
    <div className="p-6 pb-24 lg:pb-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{sidebar.deviceLogs}</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          {logsDict.subtitle}
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 max-w-3xl leading-relaxed">
          {scopeNote}
        </p>
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
