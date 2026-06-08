import { HelpPageShell } from "@/components/help";
import { loadHelpPage } from "@/lib/help";

export const dynamic = "force-dynamic";

export default async function PlatformHelpPage() {
  const props = await loadHelpPage("platform");
  return <HelpPageShell {...props} />;
}
