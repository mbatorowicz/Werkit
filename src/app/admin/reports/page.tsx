import { getDictionary } from "@/i18n";
import { ReportsDashboard } from "@/components/Admin/Reports/ReportsDashboard";
import { AdminReportService } from "@/services/AdminReportService";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const dictionary = getDictionary();
  const snapshot = await AdminReportService.getDashboardSnapshot(new Date());

  return <ReportsDashboard adminDict={dictionary.admin} snapshot={snapshot} />;
}
