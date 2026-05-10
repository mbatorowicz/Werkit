import type { WorkOrderPriority } from "@/types/worker";

/** Normalizacja wartości z bacji API — nieznane mapujemy na NORMAL (programowanie defensywne). */
export function normalizeWorkOrderPriority(value: string | null | undefined): WorkOrderPriority | null {
  if (value === "URGENT" || value === "HIGH" || value === "NORMAL" || value === "LOW") return value;
  if (value == null || value === "") return null;
  return "NORMAL";
}
