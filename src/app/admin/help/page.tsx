import { HelpPageShell } from "@/components/help";
import { loadHelpPage } from "@/lib/help";

export const dynamic = "force-dynamic";

export default async function AdminHelpPage() {
  const props = await loadHelpPage("admin");
  return <HelpPageShell {...props} />;
}
