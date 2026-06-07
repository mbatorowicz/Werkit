import { Suspense } from "react";
import OrdersClient from "@/features/admin/orders/OrdersClient";
import { RouteLoading } from "@/components/RouteLoading";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto w-full">
      <Suspense fallback={<RouteLoading />}>
        <OrdersClient />
      </Suspense>
    </div>
  );
}
