import type { WorkOrder } from "@/types/worker";

/** Kolejność sortowania: najpilniejsze najwyżej, potem najstarsze utworzone. */
export const WORK_ORDER_PRIORITY_WEIGHT: Record<string, number> = {
  URGENT: 1,
  HIGH: 2,
  NORMAL: 3,
  LOW: 4,
};

export function sortWorkOrdersByPriorityThenCreated(orders: WorkOrder[]): WorkOrder[] {
  return [...orders].sort((a, b) => {
    const pA = a.priority ? WORK_ORDER_PRIORITY_WEIGHT[a.priority] ?? 3 : 3;
    const pB = b.priority ? WORK_ORDER_PRIORITY_WEIGHT[b.priority] ?? 3 : 3;
    if (pA !== pB) return pA - pB;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

/** Powierzchnia klikalna (kreator) — zgodna z PendingOrdersList kolorystycznie. */
export function workOrderInteractiveSurfaceClass(priority: string | null): string {
  if (priority === "URGENT") {
    return "bg-red-500/10 border-red-500/50 hover:bg-red-500/20";
  }
  if (priority === "HIGH") {
    return "bg-orange-500/10 border-orange-500/50 hover:bg-orange-500/20";
  }
  return "bg-amber-500/10 border-amber-500/50 hover:bg-amber-500/20";
}

/** Karta na liście oczekujących na worker dashboardzie. */
export function workOrderPendingListCardClass(priority: string | null): string {
  if (priority === "URGENT") {
    return "bg-red-500/10 border-red-500/35 dark:bg-red-500/10 dark:border-red-500/30 rounded-xl p-4 flex flex-col gap-3 border";
  }
  if (priority === "HIGH") {
    return "bg-orange-500/10 border-orange-500/35 dark:bg-orange-500/10 dark:border-orange-500/30 rounded-xl p-4 flex flex-col gap-3 border";
  }
  return "bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-4 flex flex-col gap-3";
}

/** Kolor nagłówka kategorii na liście / w karcie. */
export function workOrderCategoryHeadingClass(priority: string | null): string {
  if (priority === "URGENT") return "text-red-400";
  if (priority === "HIGH") return "text-orange-400";
  return "text-amber-400";
}
