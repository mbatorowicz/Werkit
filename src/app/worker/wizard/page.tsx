import { redirect } from "next/navigation";
import WizardClient from "@/features/worker/components/WizardClient";
import { getUserId } from "@/lib/auth";
import { requireServerCompanyId } from "@/lib/serverTenant";

export const dynamic = "force-dynamic";

export default async function WizardPage() {
  const userId = await getUserId();
  if (!userId) {
    redirect("/login");
  }

  const companyId = await requireServerCompanyId();
  const { WorkerSessionService } = await import("@/services/WorkerSessionService");
  const details = await WorkerSessionService.getActiveSessionWithDetails(userId, companyId);

  if (!details.user?.canCreateOwnOrders) {
    redirect("/worker");
  }

  return <WizardClient userId={userId} />;
}
