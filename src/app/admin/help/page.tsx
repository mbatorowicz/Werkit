import { HelpPageShell } from "@/components/HelpPageShell";
import { getDictionary } from "@/i18n";
import { adminRoutes } from "@/lib/appRoutes";
import { getServerLocale } from "@/lib/localeCookies.server";
import { requireServerCompanyId } from "@/lib/serverTenant";
import { PlatformFeatureFlagService } from "@/services/PlatformFeatureFlagService";

export const dynamic = "force-dynamic";

export default async function AdminHelpPage() {
  const locale = await getServerLocale();
  const dict = getDictionary(locale).admin.help;
  const companyId = await requireServerCompanyId();
  const featureFlags = await PlatformFeatureFlagService.getFlags(companyId);
  const excludeSectionIds = featureFlags.durEnabled ? undefined : ["dur-warehouse"];

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto w-full">
      <HelpPageShell
        content={dict}
        backHref={adminRoutes.dispatch}
        scope="admin"
        excludeSectionIds={excludeSectionIds}
      />
    </div>
  );
}
