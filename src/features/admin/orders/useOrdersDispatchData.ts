"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  AdminDispatchBootstrap,
  BaseCategory,
  BaseCustomer,
  BaseMachine,
  BaseMaterial,
  BaseMaterialCategory,
  BaseWorker,
  UnifiedGanttItem,
} from "@/types/admin";
import {
  UI_BACKGROUND_SYNC_INTERVAL_MS,
  UI_DICTIONARY_SYNC_INTERVAL_MS,
} from "@/lib/uiBackgroundSync";
import { adminApi } from "@/lib/appRoutes";
import { fetchWithDeviceTelemetry } from "@/lib/fetchWithDeviceTelemetry";
import { parseJsonUnknown } from "@/lib/parseApiJson";
import { parseJsonArray } from "@/lib/parseJsonArray";
import {
  narrowBaseCategories,
  narrowBaseCustomers,
  narrowBaseMachines,
  narrowBaseMaterials,
  narrowBaseWorkers,
  narrowUnifiedGanttItems,
  narrowMaterialCategoryRows,
} from "@/lib/narrowApiListRows";
import { isRecord } from "@/lib/narrow/shared";
import type { DelegationScope } from "@/components/Admin/AdminAbilityProvider";

type FetchDataOptions = {
  refreshDictionaries?: boolean;
  refreshArchive?: boolean;
};

function narrowLivePayload(body: unknown): {
  orders: UnifiedGanttItem[];
  liveSessions: UnifiedGanttItem[];
} {
  if (!isRecord(body)) return { orders: [], liveSessions: [] };
  return {
    orders: narrowUnifiedGanttItems(Array.isArray(body.orders) ? body.orders : []),
    liveSessions: narrowUnifiedGanttItems(
      Array.isArray(body.liveSessions) ? body.liveSessions : []
    ),
  };
}

function narrowDictionariesPayload(body: unknown): {
  workers: BaseWorker[];
  machines: BaseMachine[];
  materials: BaseMaterial[];
  materialCategories: BaseMaterialCategory[];
  customers: BaseCustomer[];
  categories: BaseCategory[];
} | null {
  if (!isRecord(body)) return null;
  const matCats = narrowMaterialCategoryRows(
    Array.isArray(body.materialCategories) ? body.materialCategories : []
  );
  return {
    workers: narrowBaseWorkers(Array.isArray(body.workers) ? body.workers : []),
    machines: narrowBaseMachines(Array.isArray(body.machines) ? body.machines : []),
    materials: narrowBaseMaterials(Array.isArray(body.materials) ? body.materials : []),
    materialCategories: matCats.map((c) => ({
      id: c.id,
      name: c.name,
      color: c.color,
    })),
    customers: narrowBaseCustomers(Array.isArray(body.customers) ? body.customers : []),
    categories: narrowBaseCategories(Array.isArray(body.categories) ? body.categories : []),
  };
}

function useDispatchBackgroundSync(
  fetchLive: () => Promise<void>,
  fetchDictionaries: () => Promise<void>
) {
  useEffect(() => {
    let liveTimer: ReturnType<typeof setInterval> | null = null;
    let dictTimer: ReturnType<typeof setInterval> | null = null;

    const stopLive = () => {
      if (liveTimer !== null) {
        clearInterval(liveTimer);
        liveTimer = null;
      }
    };
    const stopDict = () => {
      if (dictTimer !== null) {
        clearInterval(dictTimer);
        dictTimer = null;
      }
    };

    const startLive = () => {
      if (liveTimer !== null) return;
      liveTimer = setInterval(() => {
        if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
        queueMicrotask(() => {
          void fetchLive();
        });
      }, UI_BACKGROUND_SYNC_INTERVAL_MS);
    };

    const startDict = () => {
      if (dictTimer !== null) return;
      dictTimer = setInterval(() => {
        if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
        queueMicrotask(() => {
          void fetchDictionaries();
        });
      }, UI_DICTIONARY_SYNC_INTERVAL_MS);
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        queueMicrotask(() => {
          void fetchLive();
        });
        startLive();
        startDict();
      } else {
        stopLive();
        stopDict();
      }
    };

    if (typeof document !== "undefined") {
      if (document.visibilityState === "visible") {
        startLive();
        startDict();
      }
      document.addEventListener("visibilitychange", onVisibility);
      return () => {
        document.removeEventListener("visibilitychange", onVisibility);
        stopLive();
        stopDict();
      };
    }

    return () => {
      stopLive();
      stopDict();
    };
  }, [fetchLive, fetchDictionaries]);
}

export function useOrdersDispatchData(
  _delegationScope: DelegationScope,
  initialBootstrap?: AdminDispatchBootstrap | null
) {
  const [workers, setWorkers] = useState<BaseWorker[]>(initialBootstrap?.workers ?? []);
  const [machines, setMachines] = useState<BaseMachine[]>(initialBootstrap?.machines ?? []);
  const [materials, setMaterials] = useState<BaseMaterial[]>(initialBootstrap?.materials ?? []);
  const [materialCategories, setMaterialCategories] = useState<BaseMaterialCategory[]>(
    initialBootstrap?.materialCategories ?? []
  );
  const [customers, setCustomers] = useState<BaseCustomer[]>(initialBootstrap?.customers ?? []);
  const [categories, setCategories] = useState<BaseCategory[]>(initialBootstrap?.categories ?? []);
  const [orders, setOrders] = useState<UnifiedGanttItem[]>(initialBootstrap?.orders ?? []);
  const [liveSessions, setLiveSessions] = useState<UnifiedGanttItem[]>(
    initialBootstrap?.liveSessions ?? []
  );
  const [archivedSessions, setArchivedSessions] = useState<UnifiedGanttItem[]>([]);
  const [isLoading, setIsLoading] = useState(!initialBootstrap);

  const sessions = useMemo(
    () => [...liveSessions, ...archivedSessions],
    [liveSessions, archivedSessions]
  );

  const fetchLive = useCallback(async () => {
    try {
      const res = await fetchWithDeviceTelemetry(
        "Admin dispatch: live",
        adminApi.dispatch.live,
        { cache: "no-store" },
        { category: "admin" }
      );
      const body = await parseJsonUnknown(res);
      const { orders: nextOrders, liveSessions: nextLive } = narrowLivePayload(body);
      setOrders(nextOrders);
      setLiveSessions(nextLive);
    } catch {
      /* sieć */
    }
  }, []);

  const fetchArchive = useCallback(async () => {
    try {
      const res = await fetchWithDeviceTelemetry(
        "Admin dispatch: archive",
        adminApi.dispatch.archive,
        { cache: "no-store" },
        { category: "admin" }
      );
      const data = await parseJsonArray(res);
      setArchivedSessions(narrowUnifiedGanttItems(data));
    } catch {
      /* sieć */
    }
  }, []);

  const fetchDictionaries = useCallback(async () => {
    try {
      const res = await fetchWithDeviceTelemetry(
        "Admin dispatch: dictionaries",
        adminApi.dispatch.dictionaries,
        { cache: "no-store" },
        { category: "admin" }
      );
      const body = await parseJsonUnknown(res);
      const dicts = narrowDictionariesPayload(body);
      if (!dicts) return;
      setWorkers(dicts.workers);
      setMachines(dicts.machines);
      setMaterials(dicts.materials);
      setMaterialCategories(dicts.materialCategories);
      setCustomers(dicts.customers);
      setCategories(dicts.categories);
    } catch {
      /* sieć */
    }
  }, []);

  const fetchData = useCallback(
    async (showLoader = true, opts?: FetchDataOptions) => {
      const refreshDictionaries = opts?.refreshDictionaries ?? true;
      const refreshArchive = opts?.refreshArchive ?? true;

      if (showLoader) setIsLoading(true);
      try {
        await fetchLive();
        const tasks: Promise<void>[] = [];
        if (refreshDictionaries) tasks.push(fetchDictionaries());
        if (refreshArchive) tasks.push(fetchArchive());
        await Promise.all(tasks);
      } finally {
        if (showLoader) setIsLoading(false);
      }
    },
    [fetchLive, fetchDictionaries, fetchArchive]
  );

  useEffect(() => {
    queueMicrotask(() => {
      if (initialBootstrap) {
        void fetchArchive();
      } else {
        void fetchData(true);
      }
    });
  }, [initialBootstrap, fetchArchive, fetchData]);

  useDispatchBackgroundSync(fetchLive, fetchDictionaries);

  return {
    workers,
    machines,
    materials,
    materialCategories,
    customers,
    categories,
    orders,
    sessions,
    isLoading,
    fetchData,
  };
}
