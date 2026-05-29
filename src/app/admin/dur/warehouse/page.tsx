import InventoryClient from "@/features/admin/dur/InventoryClient";
import StockMovementsClient from "@/features/admin/dur/StockMovementsClient";

export default function WarehousePage() {
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-10">
      {/* Inventory section */}
      <section>
        <InventoryClient />
      </section>

      <hr className="border-zinc-200 dark:border-zinc-700" />

      {/* Stock movements section */}
      <section>
        <StockMovementsClient />
      </section>
    </div>
  );
}
