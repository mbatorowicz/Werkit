"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  BaseCategory,
  BaseCustomer,
  BaseMachine,
  BaseMaterial,
  BaseWorker,
  UnifiedGanttItem,
} from "@/types/admin";
import { UI_BACKGROUND_SYNC_INTERVAL_MS } from "@/lib/uiBackgroundSync";
import { fetchWithDeviceTelemetry } from "@/lib/fetchWithDeviceTelemetry";
import { parseJsonArray } from "@/lib/parseJsonArray";
import {
  narrowBaseCategories,
  narrowBaseCustomers,
  narrowBaseMachines,
  narrowBaseMaterials,
  narrowBaseWorkers,
  narrowUnifiedGanttItems,
} from "@/lib/narrowApiListRows";

export function useOrdersDispatchData() {
  const [workers, setWorkers] = useState<BaseWorker[]>([]);
  const [machines, setMachines] = useState<BaseMachine[]>([]);
  const [materials, setMaterials] = useState<BaseMaterial[]>([]);
  const [customers, setCustomers] = useState<BaseCustomer[]>([]);
  const [categories, setCategories] = useState<BaseCategory[]>([]);
  const [orders, setOrders] = useState<UnifiedGanttItem[]>([]);
  const [sessions, setSessions] = useState<UnifiedGanttItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    try {
      const [wor, mac, mat, cus, cats, ords, arch] = await Promise.all([
        fetchWithDeviceTelemetry("Admin dispatch: workers", "/api/workers", { cache: "no-store" }, {
          category: "admin",
        }).then(parseJsonArray),
        fetchWithDeviceTelemetry("Admin dispatch: machines", "/api/machines", { cache: "no-store" }, {
          category: "admin",
        }).then(parseJsonArray),
        fetchWithDeviceTelemetry("Admin dispatch: materials", "/api/materials", { cache: "no-store" }, {
          category: "admin",
        }).then(parseJsonArray),
        fetchWithDeviceTelemetry("Admin dispatch: customers", "/api/customers", { cache: "no-store" }, {
          category: "admin",
        }).then(parseJsonArray),
        fetchWithDeviceTelemetry("Admin dispatch: categories", "/api/categories", { cache: "no-store" }, {
          category: "admin",
        }).then(parseJsonArray),
        fetchWithDeviceTelemetry("Admin dispatch: work-orders", "/api/admin/work-orders", { cache: "no-store" }, {
          category: "admin",
        }).then(parseJsonArray),
        fetchWithDeviceTelemetry("Admin dispatch: archive", "/api/admin/archive", { cache: "no-store" }, {
          category: "admin",
        }).then(parseJsonArray),
      ]);
      setWorkers(narrowBaseWorkers(wor));
      setMachines(narrowBaseMachines(mac));
      setMaterials(narrowBaseMaterials(mat));
      setCustomers(narrowBaseCustomers(cus));
      setCategories(narrowBaseCategories(cats));
      setOrders(narrowUnifiedGanttItems(ords));
      setSessions(narrowUnifiedGanttItems(arch));
    } catch {
      /* sieć / parsowanie — bez crasha UI */
    } finally {
      if (showLoader) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void fetchData(true);
    });

    let pollTimer: ReturnType<typeof setInterval> | null = null;

    const stopPolling = () => {
      if (pollTimer !== null) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    };

    const startPolling = () => {
      if (pollTimer !== null) return;
      pollTimer = setInterval(() => {
        if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
        queueMicrotask(() => {
          void fetchData(false);
        });
      }, UI_BACKGROUND_SYNC_INTERVAL_MS);
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        queueMicrotask(() => {
          void fetchData(false);
        });
        startPolling();
      } else {
        stopPolling();
      }
    };

    if (typeof document !== "undefined") {
      if (document.visibilityState === "visible") {
        startPolling();
      }
      document.addEventListener("visibilitychange", onVisibility);
      return () => {
        document.removeEventListener("visibilitychange", onVisibility);
        stopPolling();
      };
    }

    return () => {
      stopPolling();
    };
  }, [fetchData]);

  return {
    workers,
    machines,
    materials,
    customers,
    categories,
    orders,
    sessions,
    isLoading,
    fetchData,
  };
}
