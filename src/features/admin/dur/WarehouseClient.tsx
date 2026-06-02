"use client";

import { Package } from "lucide-react";
import { getDictionary } from "@/i18n";
import StockMovementsClient from "@/features/admin/dur/StockMovementsClient";

export default function WarehouseClient() {
  const dict = getDictionary().dur.warehouse;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">
          <Package className="h-6 w-6 text-emerald-500" />
          {dict.title}
        </h1>
        <p className="mt-2 text-sm text-zinc-500">{dict.subtitle}</p>
      </div>

      <section>
        <StockMovementsClient />
      </section>
    </div>
  );
}
