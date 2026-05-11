"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useOrdersDispatchData } from "@/features/admin/orders/useOrdersDispatchData";
import { Map, Plus, Settings, RefreshCw } from "lucide-react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { getDictionary } from "@/i18n";
import SessionDetailsModal from "@/components/Admin/Modals/SessionDetailsModal";
import GanttChart from "@/components/GanttChart/GanttChart";
import OrderFormModal from "@/components/Admin/Modals/OrderFormModal";
import { UnifiedGanttItem, OrderFormState } from "@/types/admin";
import { useAdminAbility } from "@/components/Admin/AdminAbilityProvider";
import { buildUnifiedDispatchItems, formatDueDatetimeLocal } from "@/features/admin/orders/dispatchPlanning";
import { OrdersDispatchToolbar } from "@/components/Admin/Orders/OrdersDispatchToolbar";
import { OrdersDispatchTable } from "@/components/Admin/Orders/OrdersDispatchTable";
import { OrdersSettingsQuickModal } from "@/components/Admin/Orders/OrdersSettingsQuickModal";
import type { DispatchViewMode } from "@/components/Admin/Orders/OrdersDispatchToolbar";
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

  const {
    workers,
    machines,
    materials,
    customers,
    categories,
    orders,
    sessions,
    isLoading,
    fetchData,
  } = useOrdersDispatchData();

  const [searchQuery, setSearchQuery] = useState("");
  const [tableLimit, setTableLimit] = useState(20);
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<DispatchViewMode>(() => {
    try {
      const raw = localStorage.getItem("werkit_admin_dispatch_view");
      return raw === "board" || raw === "table" ? raw : "board";
    } catch {
      return "board";
    }
  });
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

  const setViewModePersisted = (m: DispatchViewMode) => {
    setViewMode(m);
    setPage(1);
    try {
      localStorage.setItem("werkit_admin_dispatch_view", m);
    } catch {
      /* ignore */
    }
  };
  const setSearchQueryAndResetPage = (q: string) => {
    setSearchQuery(q);
    setPage(1);
  };
  const setTableLimitAndResetPage = (n: number) => {
    setTableLimit(n);
    setPage(1);
  };

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

  // Kolumny: karta + status (+opcjonalnie akcje)
  const tableColSpan = canMutate ? 3 : 2;

  const unifiedItems = useMemo(
    () => buildUnifiedDispatchItems(orders, sessions, searchQuery),
    [orders, sessions, searchQuery],
  );

  const totalPages = useMemo(() => {
    if (viewMode !== "table") return 1;
    return Math.max(1, Math.ceil(unifiedItems.length / Math.max(1, tableLimit)));
  }, [unifiedItems.length, tableLimit, viewMode]);

  const safePage = Math.min(page, totalPages);

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
          onSearchChange={setSearchQueryAndResetPage}
          tableLimit={tableLimit}
          onTableLimitChange={setTableLimitAndResetPage}
          viewMode={viewMode}
          onViewModeChange={setViewModePersisted}
          page={safePage}
          totalPages={totalPages}
          onPageChange={setPage}
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
          viewMode={viewMode}
          page={safePage}
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
