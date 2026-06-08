import { PlatformDashboard } from "@/components/Platform/PlatformDashboard";
import { getDictionary } from "@/i18n";
import { getServerLocale } from "@/lib/localeCookies.server";
import { PlatformAnalyticsService } from "@/services/PlatformAnalyticsService";

export const dynamic = "force-dynamic";

export default async function PlatformPage() {
  const dict = getDictionary(await getServerLocale());
  const overview = await PlatformAnalyticsService.getCompaniesUsageOverview();

  return <PlatformDashboard initialOverview={overview} dict={dict.platform} />;
}
