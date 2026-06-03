import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import WorkerEditOrderClient from "@/features/worker/components/edit-order/WorkerEditOrderClient";
import { getUserId } from "@/lib/auth";
import { requireServerCompanyId } from "@/lib/serverTenant";
import { getDictionary } from "@/i18n";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function WorkerEditOrderPage({ params }: PageProps) {
  const { id: idRaw } = await params;
  const orderId = parseInt(idRaw, 10);
  if (!Number.isFinite(orderId) || orderId <= 0) {
    redirect("/worker");
  }

  const dict = getDictionary().worker.profile;
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
      <WorkerEditOrderClient
        orderId={orderId}
        userId={userId}
        canCreateCustomers={details.user?.canCreateCustomers === true}
      />
    </div>
  );
}
