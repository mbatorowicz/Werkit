import { getDictionary, type Locale } from "@/i18n";
import { adminRoutes, platformRoutes, workerRoutes } from "@/lib/appRoutes";
import { getServerLocale } from "@/lib/localeCookies.server";
import { requireServerCompanyId } from "@/lib/serverTenant";
import { PlatformFeatureFlagService } from "@/services/PlatformFeatureFlagService";
import type { HelpPageContent } from "@/types/help";
import {
  DEFAULT_HELP_PHONE,
  DUR_SECTION_BY_SCOPE,
  type HelpScope,
} from "@/lib/help/constants";

export type HelpPageViewModel = {
  content: HelpPageContent;
  backHref: string;
  scope: HelpScope;
  phone?: string;
  excludeSectionIds?: string[];
};

function getHelpContent(scope: HelpScope, locale: Locale): HelpPageContent {
  const dict = getDictionary(locale);
  if (scope === "worker") return dict.worker.help;
  if (scope === "admin") return dict.admin.help;
  return dict.platform.help;
}

function getBackHref(scope: HelpScope): string {
  if (scope === "worker") return workerRoutes.home;
  if (scope === "admin") return adminRoutes.dispatch;
  return platformRoutes.home;
}

/** Ładuje dane ekranu pomocy (treść i18n, telefon firmy, filtr sekcji DUR). */
export async function loadHelpPage(scope: HelpScope): Promise<HelpPageViewModel> {
  const locale = await getServerLocale();
  const viewModel: HelpPageViewModel = {
    content: getHelpContent(scope, locale),
    backHref: getBackHref(scope),
    scope,
  };

  if (scope === "platform") {
    return viewModel;
  }

  const durSectionId = DUR_SECTION_BY_SCOPE[scope];

  try {
    const companyId = await requireServerCompanyId();
    const featureFlags = await PlatformFeatureFlagService.getFlags(companyId);

    if (!featureFlags.durEnabled) {
      viewModel.excludeSectionIds = [durSectionId];
    }

    if (scope === "worker") {
      const { DictionaryService } = await import("@/services/DictionaryService");
      const settings = await DictionaryService.getSettings(companyId);
      viewModel.phone = settings[0]?.phone || DEFAULT_HELP_PHONE;
    }
  } catch (error) {
    console.error(`Failed to load help page context (${scope}):`, error);
    if (scope === "worker") {
      viewModel.phone = DEFAULT_HELP_PHONE;
    }
  }

  return viewModel;
}
