import { getDictionary } from "@/i18n";
import { ReportsDashboard } from "@/components/Admin/Reports/ReportsDashboard";
import { AdminReportService } from "@/services/AdminReportService";
import { requireServerCompanyId } from '@/lib/serverTenant';

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const companyId = await requireServerCompanyId();
  const dictionary = getDictionary();
  const snapshot = await AdminReportService.getDashboardSnapshot(companyId, new Date());

  return <ReportsDashboard adminDict={dictionary.admin} snapshot={snapshot} />;
}
