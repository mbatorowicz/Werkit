import type { OrderType } from "@/types/worker";

/** Bezpieczne zawężenie wartości `order_type` z API / bazy. */
export function narrowOrderType(value: unknown): OrderType {
  return value === "machine_repair" ? "machine_repair" : "machine_work";
}

/**
 * Rodzaj zlecenia: jawny z body ma pierwszeństwo, potem kategoria, na końcu `machine_work`.
 */
export function resolveOrderType(explicit: unknown, categoryOrderType: unknown): OrderType {
  if (explicit === "machine_repair" || explicit === "machine_work") return explicit;
  return narrowOrderType(categoryOrderType);
}

export function isRepairOrderType(orderType: OrderType | string | null | undefined): boolean {
  return orderType === "machine_repair";
}
