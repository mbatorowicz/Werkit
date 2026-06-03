import type { OrderType } from "@/types/worker";
import { isRepairOrderType } from "@/lib/orderType";
import { normalizeDecimalBodyField } from "@/lib/decimalInput";

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
    quantityTons: normalizeDecimalBodyField(quantityTons),
  };
}
