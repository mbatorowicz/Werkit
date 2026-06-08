import { HelpPageShell } from "@/components/HelpPageShell";
import { getDictionary } from "@/i18n";
import { platformRoutes } from "@/lib/appRoutes";
import { getServerLocale } from "@/lib/localeCookies.server";

export const dynamic = "force-dynamic";

export default async function PlatformHelpPage() {
  const dict = getDictionary(await getServerLocale()).platform.help;

  return (
    <HelpPageShell content={dict} backHref={platformRoutes.home} scope="platform" />
  );
}
