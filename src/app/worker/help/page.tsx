import { HelpPageShell } from "@/components/HelpPageShell";
import { getDictionary } from "@/i18n";
import { getServerLocale } from "@/lib/localeCookies.server";
import { requireServerCompanyId } from "@/lib/serverTenant";
import { PlatformFeatureFlagService } from "@/services/PlatformFeatureFlagService";

export const dynamic = "force-dynamic";

export default async function HelpPage() {
  const dict = getDictionary(await getServerLocale()).worker.help;
  let phone = "112";
  let excludeSectionIds: string[] | undefined;

  try {
    const companyId = await requireServerCompanyId();
    const { DictionaryService } = await import("@/services/DictionaryService");
    const [settingsData, featureFlags] = await Promise.all([
      DictionaryService.getSettings(companyId),
      PlatformFeatureFlagService.getFlags(companyId),
    ]);
    if (settingsData.length > 0 && settingsData[0].phone) {
      phone = settingsData[0].phone;
    }
    if (!featureFlags.durEnabled) {
      excludeSectionIds = ["dur-parts"];
    }
  } catch (e) {
    console.error("Failed to load settings in HelpPage:", e);
  }

  return (
    <HelpPageShell
      content={dict}
      backHref="/worker"
      scope="worker"
      phone={phone}
      excludeSectionIds={excludeSectionIds}
    />
  );
}
