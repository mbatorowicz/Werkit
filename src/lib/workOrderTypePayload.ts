import type { OrderType } from "@/types/worker";
import { isRepairOrderType } from "@/lib/orderType";

/** Dla napraw nie zapisujemy materiału ani ilości w tonach. */
export function normalizeWorkOrderMaterialFields(
  orderType: OrderType,
  materialId: number | null,
  quantityTons: string | number | null
): { materialId: number | null; quantityTons: string | null } {
  if (isRepairOrderType(orderType)) {
    return { materialId: null, quantityTons: null };
  }
  return {
    materialId,
    quantityTons:
      quantityTons !== null && String(quantityTons).trim() !== "" ? String(quantityTons) : null,
  };
}
