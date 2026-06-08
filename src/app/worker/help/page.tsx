import { HelpPageShell } from "@/components/help";
import { loadHelpPage } from "@/lib/help";

export const dynamic = "force-dynamic";

export default async function WorkerHelpPage() {
  const props = await loadHelpPage("worker");
  return <HelpPageShell {...props} />;
}
