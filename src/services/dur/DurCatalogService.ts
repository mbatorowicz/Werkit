import { SparePartService } from "@/services/dur/SparePartService";
import { InventoryService } from "@/services/dur/InventoryService";

export type SparePartWithStock = Awaited<ReturnType<typeof SparePartService.getParts>>[number] & {
  stockQuantity: string;
};

/**
 * Katalog części z aktualnym stanem magazynowym (admin + worker).
 */
export class DurCatalogService {
  static async getPartsWithStock(
    companyId: number,
    opts?: { compatibleWithResourceGroupId?: number; activeOnly?: boolean }
  ): Promise<SparePartWithStock[]> {
    const parts = await SparePartService.getParts(companyId, {
      compatibleWithResourceGroupId: opts?.compatibleWithResourceGroupId,
    });
    const inventory = await InventoryService.getInventory(companyId);
    const qtyByPart = new Map(inventory.map((i) => [i.partId, i.quantity]));

    let mapped = parts.map((p) => ({
      ...p,
      stockQuantity: qtyByPart.get(p.id) ?? "0",
    }));

    if (opts?.activeOnly !== false) {
      mapped = mapped.filter((p) => p.isActive);
    }

    return mapped;
  }
}
