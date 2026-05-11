"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { OrderFormState, UnifiedGanttItem } from "@/types/admin";
import { formatDueDatetimeLocal } from "@/features/admin/orders/dispatchPlanning";

const EMPTY_ORDER_FORM: OrderFormState = {
  userId: "",
  resourceId: "",
  categoryId: "",
  materialId: "",
  customerId: "",
  taskDescription: "",
  quantityTons: "",
  priority: "NORMAL",
  expectedDurationHours: "",
  dueDate: "",
  forceSave: false,
};

/**
 * `?open=` (ID zlecenia lub sesji) + stan modala edycji zlecenia oraz wyboru sesji
 * (np. podgląd z archiwum po deep linku).
 */
export function useOrdersDeepLink({
  canMutate,
  orders,
  sessions,
  isLoading,
}: {
  canMutate: boolean;
  orders: UnifiedGanttItem[];
  sessions: UnifiedGanttItem[];
  isLoading: boolean;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);
  const [orderFormInitial, setOrderFormInitial] = useState<OrderFormState>(() => ({ ...EMPTY_ORDER_FORM }));
  const [selectedDispatchItem, setSelectedDispatchItem] = useState<UnifiedGanttItem | null>(null);

  const handledOpenRef = useRef<string | null>(null);

  const handleEditOrder = useCallback(
    (item: UnifiedGanttItem) => {
      if (!canMutate) return;
      setEditingOrderId(item.workOrderId || item.id);
      setOrderFormInitial({
        userId: String(item.userId || ""),
        resourceId: String(item.resourceId || ""),
        categoryId: String(item.categoryId || ""),
        materialId: String(item.materialId || ""),
        customerId: String(item.customerId || ""),
        taskDescription: item.taskDescription || "",
        quantityTons: String(item.quantityTons || ""),
        priority: item.priority || "NORMAL",
        expectedDurationHours: String(item.expectedDurationHours || ""),
        dueDate: formatDueDatetimeLocal(item.dueDate as string | null),
        forceSave: false,
      });
      setSelectedDispatchItem(null);
      setIsOrderModalOpen(true);
    },
    [canMutate],
  );

  useEffect(() => {
    const openRaw = searchParams.get("open");
    if (!openRaw) {
      handledOpenRef.current = null;
      return;
    }
    if (isLoading) return;
    if (orders.length === 0 && sessions.length === 0) return;

    const key = `${pathname}:${openRaw}`;
    if (handledOpenRef.current === key) return;
    handledOpenRef.current = key;

    const openId = Number.parseInt(openRaw, 10);
    if (Number.isNaN(openId)) {
      handledOpenRef.current = null;
      router.replace(pathname, { scroll: false });
      return;
    }

    const order = orders.find((o) => o.id === openId);
    if (order) {
      queueMicrotask(() => handleEditOrder(order));
    } else {
      const session = sessions.find((s) => s.workOrderId === openId || s.id === openId);
      if (session) {
        queueMicrotask(() => setSelectedDispatchItem({ ...session, _type: "SESSION" }));
      }
    }
    router.replace(pathname, { scroll: false });
  }, [searchParams, orders, sessions, isLoading, router, pathname, handleEditOrder]);

  const openNewOrderModal = useCallback(() => {
    setEditingOrderId(null);
    setOrderFormInitial({ ...EMPTY_ORDER_FORM });
    setIsOrderModalOpen(true);
  }, []);

  const closeOrderModal = useCallback(() => {
    setIsOrderModalOpen(false);
    setEditingOrderId(null);
  }, []);

  const closeSessionDetails = useCallback(() => {
    setSelectedDispatchItem(null);
  }, []);

  const onDispatchItemClick = useCallback(
    (item: UnifiedGanttItem) => {
      if (item._type === "ORDER") {
        if (canMutate) handleEditOrder(item);
      } else {
        setSelectedDispatchItem(item);
      }
    },
    [canMutate, handleEditOrder],
  );

  return {
    isOrderModalOpen,
    editingOrderId,
    orderFormInitial,
    openNewOrderModal,
    closeOrderModal,
    handleEditOrder,
    selectedDispatchItem,
    closeSessionDetails,
    onDispatchItemClick,
  };
}
