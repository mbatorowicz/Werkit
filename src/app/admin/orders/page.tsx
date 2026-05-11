import { Suspense } from "react";
import OrdersClient from "./OrdersClient";

export const dynamic = "force-dynamic";

/** Alias ścieżki dla linków z Gantt (`?open=`); ten sam widok co `/admin`. */
export default function AdminOrdersPage() {
  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto w-full">
      <Suspense fallback={<div className="p-12 flex justify-center">Wczytywanie...</div>}>
        <OrdersClient />
      </Suspense>
    </div>
  );
}
