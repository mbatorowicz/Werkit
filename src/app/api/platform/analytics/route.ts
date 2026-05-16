import { jsonOk, withApiErrorHandling } from '@/lib/apiRoute';
import { requireSuperadminSession } from '@/lib/apiPlatform';
import { PlatformAnalyticsService } from '@/services/PlatformAnalyticsService';

export const dynamic = 'force-dynamic';

export const GET = withApiErrorHandling(async () => {
  const auth = await requireSuperadminSession();
  if (!auth.ok) return auth.response;

  const overview = await PlatformAnalyticsService.getCompaniesUsageOverview();
  return jsonOk(overview);
}, { defaultErrorCode: 'fetch_error' });
