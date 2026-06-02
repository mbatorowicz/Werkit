import { redirect } from "next/navigation";
import WarehouseClient from "@/features/admin/dur/WarehouseClient";
import { adminRoutes } from "@/lib/appRoutes";
import { requireServerCompanyId } from "@/lib/serverTenant";
import { PlatformFeatureFlagService } from "@/services/PlatformFeatureFlagService";

export default async function WarehousePage() {
  const companyId = await requireServerCompanyId();
  const flags = await PlatformFeatureFlagService.getFlags(companyId);
  if (!flags.durEnabled) {
    redirect(adminRoutes.dispatch);
  }

  return (
    <div className="mx-auto w-full max-w-7xl p-6 md:p-8">
      <WarehouseClient />
    </div>
  );
}
