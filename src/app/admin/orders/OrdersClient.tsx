"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Map, Plus, Settings, RefreshCw } from "lucide-react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { getDictionary } from "@/i18n";
import SessionDetailsModal from "@/components/Admin/Modals/SessionDetailsModal";
import GanttChart from "@/components/GanttChart/GanttChart";
import OrderFormModal from "@/components/Admin/Modals/OrderFormModal";
import {
  UnifiedGanttItem,
  OrderFormState,
  BaseWorker,
  BaseMachine,
  BaseMaterial,
  BaseCustomer,
  BaseCategory,
} from "@/types/admin";
import { useAdminAbility } from "@/components/Admin/AdminAbilityProvider";
import { buildUnifiedDispatchItems, formatDueDatetimeLocal } from "@/features/admin/orders/dispatchPlanning";
import { OrdersDispatchToolbar } from "@/components/Admin/Orders/OrdersDispatchToolbar";
import { OrdersDispatchTable } from "@/components/Admin/Orders/OrdersDispatchTable";
import { OrdersSettingsQuickModal } from "@/components/Admin/Orders/OrdersSettingsQuickModal";

async function parseJsonArray(res: Response): Promise<unknown[]> {
  if (!res.ok) return [];
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) return [];
  try {
    const data: unknown = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export default function OrdersClient() {
  const { canMutate } = useAdminAbility();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const dictionary = getDictionary();
  const dict = dictionary.admin.orders;
  const navTitle = dictionary.admin.sidebar.dispatch;
  const archiveDict = dictionary.admin.archive;
  const workerUiLabels = dictionary.worker.client;
  const apiErrors = dictionary.apiErrors as Record<string, string>;

  const [workers, setWorkers] = useState<BaseWorker[]>([]);
  const [machines, setMachines] = useState<BaseMachine[]>([]);
  const [materials, setMaterials] = useState<BaseMaterial[]>([]);
  const [customers, setCustomers] = useState<BaseCustomer[]>([]);
  const [categories, setCategories] = useState<BaseCategory[]>([]);
  const [orders, setOrders] = useState<UnifiedGanttItem[]>([]);
  const [sessions, setSessions] = useState<UnifiedGanttItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [tableLimit, setTableLimit] = useState(20);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsData, setSettingsData] = useState<unknown>(null);
  const [selectedItem, setSelectedItem] = useState<UnifiedGanttItem | null>(null);
  const [form, setForm] = useState({
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
  });
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);

  const handledOpenRef = useRef<string | null>(null);

  const fetchData = useCallback(async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    try {
      const [wor, mac, mat, cus, cats, ords, arch] = await Promise.all([
        fetch("/api/workers", { cache: "no-store" }).then(parseJsonArray),
        fetch("/api/machines", { cache: "no-store" }).then(parseJsonArray),
        fetch("/api/materials", { cache: "no-store" }).then(parseJsonArray),
        fetch("/api/customers", { cache: "no-store" }).then(parseJsonArray),
        fetch("/api/categories", { cache: "no-store" }).then(parseJsonArray),
        fetch("/api/admin/work-orders", { cache: "no-store" }).then(parseJsonArray),
        fetch("/api/admin/archive", { cache: "no-store" }).then(parseJsonArray),
      ]);
      setWorkers(wor as BaseWorker[]);
      setMachines(mac as BaseMachine[]);
      setMaterials(mat as BaseMaterial[]);
      setCustomers(cus as BaseCustomer[]);
      setCategories(cats as BaseCategory[]);
      setOrders(ords as UnifiedGanttItem[]);
      setSessions(arch as UnifiedGanttItem[]);
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
    const interval = setInterval(() => {
      queueMicrotask(() => {
        void fetchData(false);
      });
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleEditClick = useCallback((item: UnifiedGanttItem) => {
    if (!canMutate) return;
    setEditingOrderId(item.workOrderId || item.id);
    setForm({
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
    setSelectedItem(null);
    setIsModalOpen(true);
  }, [canMutate]);

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
      queueMicrotask(() => handleEditClick(order));
    } else {
      const session = sessions.find((s) => s.workOrderId === openId || s.id === openId);
      if (session) {
        queueMicrotask(() => setSelectedItem({ ...session, _type: "SESSION" }));
      }
    }
    router.replace(pathname, { scroll: false });
  }, [searchParams, orders, sessions, isLoading, router, pathname, handleEditClick]);

  const readAdminError = async (res: Response): Promise<string | undefined> => {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    return data.error;
  };

  const handleDeleteWorkOrder = async (orderId: number) => {
    const res = await fetch(`/api/admin/work-orders/${orderId}`, { method: "DELETE" });
    if (!res.ok) {
      const code = await readAdminError(res);
      alert(apiErrors[code ?? ""] ?? code ?? dict.error);
      throw new Error(code ?? "delete_failed");
    }
    alert(dict.mutationOk);
    fetchData(true);
  };

  const handleForceCompleteSession = async (sessionId: number) => {
    const res = await fetch(`/api/admin/work-sessions/${sessionId}/force-complete`, { method: "POST" });
    if (!res.ok) {
      const code = await readAdminError(res);
      alert(apiErrors[code ?? ""] ?? code ?? dict.error);
      throw new Error(code ?? "complete_failed");
    }
    alert(dict.mutationOk);
    setSelectedItem(null);
    fetchData(true);
  };

  const handleDeleteArchivedSession = async (sessionId: number) => {
    const res = await fetch(`/api/admin/work-sessions/${sessionId}`, { method: "DELETE" });
    if (!res.ok) {
      const code = await readAdminError(res);
      alert(apiErrors[code ?? ""] ?? code ?? dict.error);
      throw new Error(code ?? "delete_failed");
    }
    alert(dict.mutationOk);
    setSelectedItem(null);
    fetchData(true);
  };

  const tableColSpan = canMutate ? 5 : 4;

  const unifiedItems = useMemo(
    () => buildUnifiedDispatchItems(orders, sessions, searchQuery),
    [orders, sessions, searchQuery],
  );

  const handleRowClick = (item: UnifiedGanttItem) => {
    if (item._type === "ORDER") {
      if (canMutate) handleEditClick(item);
    } else setSelectedItem(item);
  };

  return (
    <>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
            <Map className="w-6 h-6 text-emerald-500" /> {navTitle}
          </h1>
          <p className="text-zinc-500 mt-1">{dict.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={async () => {
              setIsSettingsOpen(true);
              try {
                const res = await fetch("/api/settings");
                if (res.ok) setSettingsData(await res.json());
              } catch {
                /* ignore */
              }
            }}
            className="p-2.5 bg-white dark:bg-zinc-900 text-zinc-500 hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition active:scale-95"
            title={dict.tooltipSettings}
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => fetchData(true)}
            className="p-2.5 bg-white dark:bg-zinc-900 text-zinc-500 hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition active:scale-95"
            title={dict.tooltipRefresh}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {canMutate && (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-5 py-2.5 text-sm font-semibold rounded-lg hover:bg-zinc-800 dark:hover:bg-white transition shadow-sm flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> {dict.newOrder}
            </button>
          )}
        </div>
      </div>

      <OrdersSettingsQuickModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settingsData={settingsData}
        title={dict.settingsModalTitle}
      />

      <GanttChart
        workers={workers}
        machines={machines}
        unifiedItems={unifiedItems}
        onItemClick={(item) => {
          if (item._type === "ORDER") {
            if (canMutate) handleEditClick(item);
          } else setSelectedItem(item);
        }}
      />

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg flex flex-col overflow-hidden shadow-sm">
        <OrdersDispatchToolbar
          dict={dict}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          tableLimit={tableLimit}
          onTableLimitChange={setTableLimit}
        />
        <OrdersDispatchTable
          ordersDict={dict}
          archiveDict={archiveDict}
          workerUiLabels={workerUiLabels}
          canMutate={canMutate}
          isLoading={isLoading}
          tableColSpan={tableColSpan}
          tableLimit={tableLimit}
          unifiedItems={unifiedItems}
          onRowClick={handleRowClick}
          onDeleteWorkOrder={handleDeleteWorkOrder}
          onForceCompleteSession={handleForceCompleteSession}
          onDeleteArchivedSession={handleDeleteArchivedSession}
        />
      </div>

      {isModalOpen && (
        <OrderFormModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingOrderId(null);
          }}
          onDeletePending={
            canMutate && editingOrderId
              ? async () => {
                  await handleDeleteWorkOrder(editingOrderId);
                  setIsModalOpen(false);
                  setEditingOrderId(null);
                }
              : undefined
          }
          onSave={async (formData: OrderFormState) => {
            const url = editingOrderId ? `/api/admin/work-orders/${editingOrderId}` : "/api/admin/work-orders";
            const method = editingOrderId ? "PUT" : "POST";
            const payload = { ...formData };
            if (payload.dueDate) {
              payload.dueDate = new Date(payload.dueDate).toISOString();
            }
            const res = await fetch(url, {
              method,
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
            if (res.ok) {
              alert(dict.success);
              setIsModalOpen(false);
              setEditingOrderId(null);
              fetchData(true);
            } else {
              const data = await res.json();
              alert(apiErrors[data.error] || data.error || dict.error);
            }
          }}
          editingOrderId={editingOrderId}
          dict={dict}
          workers={workers}
          machines={machines}
          materials={materials}
          customers={customers}
          categories={categories}
          initialForm={form}
        />
      )}

      {selectedItem && (
        <SessionDetailsModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onEdit={canMutate ? handleEditClick : undefined}
          canMutate={canMutate}
          onForceCompleteSession={canMutate ? handleForceCompleteSession : undefined}
          onDeleteArchivedSession={canMutate ? handleDeleteArchivedSession : undefined}
        />
      )}
    </>
  );
}
