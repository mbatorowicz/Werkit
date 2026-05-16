import { PlatformDashboard } from '@/components/Platform/PlatformDashboard';
import { getDictionary } from '@/i18n';
import { PlatformAnalyticsService } from '@/services/PlatformAnalyticsService';

export const dynamic = 'force-dynamic';

export default async function PlatformPage() {
  const dict = getDictionary();
  const overview = await PlatformAnalyticsService.getCompaniesUsageOverview();

  return <PlatformDashboard initialOverview={overview} dict={dict.platform} />;
}
