import { Suspense } from "react";
import OrdersClient from "@/features/admin/orders/OrdersClient";
import { RouteLoading } from "@/components/RouteLoading";
import { requireLiveCompanyPrincipalOrRedirect } from "@/lib/livePrincipal";
import { AdminDispatchService } from "@/services/AdminDispatchService";
import { DelegationScopeService } from "@/services/DelegationScopeService";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const principal = await requireLiveCompanyPrincipalOrRedirect();
  const companyId = principal.companyId;

  const canMutate = principal.role === "admin";
  const hasDelegation = await DelegationScopeService.hasDelegationRights(
    companyId,
    principal.userId
  );
  const scopedWorkers = !canMutate && hasDelegation;

  const bootstrap = await AdminDispatchService.getBootstrap({
    companyId,
    actorUserId: principal.userId,
    actorRole: principal.role,
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
