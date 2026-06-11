import { Suspense } from "react";
import OrdersClient from "@/features/admin/orders/OrdersClient";
import { RouteLoading } from "@/components/RouteLoading";
import { requireServerCompanyId } from "@/lib/serverTenant";
import { getAuthSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminDispatchService } from "@/services/AdminDispatchService";
import { DelegationScopeService } from "@/services/DelegationScopeService";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const companyId = await requireServerCompanyId();
  const session = await getAuthSession();
  if (!session) redirect("/login");

  const canMutate = session.role === "admin";
  const hasDelegation = await DelegationScopeService.hasDelegationRights(companyId, session.userId);
  const scopedWorkers = !canMutate && hasDelegation;

  const bootstrap = await AdminDispatchService.getBootstrap({
    companyId,
    actorUserId: session.userId,
    actorRole: session.role,
    scopedWorkers,
  });

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto w-full">
      <Suspense fallback={<RouteLoading />}>
        <OrdersClient initialBootstrap={bootstrap} />
      </Suspense>
    </div>
  );
}
