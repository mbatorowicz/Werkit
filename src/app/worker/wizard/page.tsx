import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import WizardClient from "@/features/worker/components/wizard/WizardClient";
import { getUserId } from "@/lib/auth";
import { requireServerCompanyId } from "@/lib/serverTenant";
import { getDictionary } from "@/i18n";
import { getServerLocale } from "@/lib/localeCookies.server";

export const dynamic = "force-dynamic";

export default async function WizardPage() {
  const dict = getDictionary(await getServerLocale()).worker.profile;
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

  return (
    <div className="py-6">
      <Link
        href="/worker"
        className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white mb-4 transition-colors px-4"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm font-semibold">{dict.backToSession}</span>
      </Link>
      <WizardClient
        userId={userId}
        canCreateCustomers={details.user?.canCreateCustomers === true}
      />
    </div>
  );
}
