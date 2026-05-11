"use client";

import { useMemo, useState } from "react";
import { Map, Plus, RefreshCw, Settings } from "lucide-react";
import { getDictionary } from "@/i18n";
import SessionDetailsModal from "@/components/Admin/Modals/SessionDetailsModal";
import GanttChart from "@/components/GanttChart/GanttChart";
import OrderFormModal from "@/components/Admin/Modals/OrderFormModal";
import type { OrderFormState } from "@/types/admin";
import { useAdminAbility } from "@/components/Admin/AdminAbilityProvider";
import { buildUnifiedDispatchItems } from "@/features/admin/orders/dispatchPlanning";
import { OrdersDispatchToolbar } from "@/components/Admin/Orders/OrdersDispatchToolbar";
import { OrdersDispatchTable } from "@/components/Admin/Orders/OrdersDispatchTable";
import { OrdersSettingsQuickModal } from "@/components/Admin/Orders/OrdersSettingsQuickModal";
import type { DispatchViewMode } from "@/components/Admin/Orders/OrdersDispatchToolbar";
import { useOrdersDeepLink } from "@/features/admin/orders/useOrdersDeepLink";
import { useOrdersDispatchData } from "@/features/admin/orders/useOrdersDispatchData";
import { parseJsonUnknown, readApiErrorString } from "@/lib/parseApiJson";
import { isRecord } from "@/lib/narrowApiListRows";

export default function OrdersClient() {
  const { canMutate } = useAdminAbility();

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

  const {
    isOrderModalOpen,
    editingOrderId,
    orderFormInitial,
    openNewOrderModal,
    closeOrderModal,
    handleEditOrder,
    selectedDispatchItem,
    closeSessionDetails,
    onDispatchItemClick,
  } = useOrdersDeepLink({ canMutate, orders, sessions, isLoading });

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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsData, setSettingsData] = useState<unknown>(null);

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

  const readAdminError = async (res: Response): Promise<string | undefined> => {
    const body = await parseJsonUnknown(res);
    return readApiErrorString(body);
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
    closeSessionDetails();
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
    closeSessionDetails();
    fetchData(true);
  };

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

  return (
    <>
      <div className="mb-6 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">
            <Map className="h-6 w-6 text-emerald-500" /> {navTitle}
          </h1>
          <p className="mt-1 text-zinc-500">{dict.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={async () => {
              setIsSettingsOpen(true);
              try {
                const res = await fetch("/api/settings");
                if (res.ok) {
                  const raw = await parseJsonUnknown(res);
                  if (isRecord(raw)) setSettingsData(raw);
                }
              } catch {
                /* ignore */
              }
            }}
            className="rounded-lg border border-zinc-200 bg-white p-2.5 text-zinc-500 shadow-sm transition hover:bg-zinc-50 hover:text-zinc-900 active:scale-95 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white"
            title={dict.tooltipSettings}
          >
            <Settings className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => fetchData(true)}
            className="rounded-lg border border-zinc-200 bg-white p-2.5 text-zinc-500 shadow-sm transition hover:bg-zinc-50 hover:text-zinc-900 active:scale-95 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white"
            title={dict.tooltipRefresh}
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          {canMutate ? (
            <button
              type="button"
              onClick={openNewOrderModal}
              className="flex items-center gap-2 rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
            >
              <Plus className="h-4 w-4" /> {dict.newOrder}
            </button>
          ) : null}
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
        onItemClick={onDispatchItemClick}
      />

      <div className="flex flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
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
          onRowClick={onDispatchItemClick}
          onDeleteWorkOrder={handleDeleteWorkOrder}
          onForceCompleteSession={handleForceCompleteSession}
          onDeleteArchivedSession={handleDeleteArchivedSession}
        />
      </div>

      {isOrderModalOpen ? (
        <OrderFormModal
          isOpen={isOrderModalOpen}
          onClose={closeOrderModal}
          onDeletePending={
            canMutate && editingOrderId
              ? async () => {
                  await handleDeleteWorkOrder(editingOrderId);
                  closeOrderModal();
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
              closeOrderModal();
              fetchData(true);
            } else {
              const body = await parseJsonUnknown(res);
              const code = readApiErrorString(body);
              alert(apiErrors[code ?? ""] ?? code ?? dict.error);
            }
          }}
          editingOrderId={editingOrderId}
          dict={dict}
          workers={workers}
          machines={machines}
          materials={materials}
          customers={customers}
          categories={categories}
          initialForm={orderFormInitial}
        />
      ) : null}

      {selectedDispatchItem ? (
        <SessionDetailsModal
          item={selectedDispatchItem}
          onClose={closeSessionDetails}
          onEdit={canMutate ? handleEditOrder : undefined}
          canMutate={canMutate}
          onForceCompleteSession={canMutate ? handleForceCompleteSession : undefined}
          onDeleteArchivedSession={canMutate ? handleDeleteArchivedSession : undefined}
        />
      ) : null}
    </>
  );
}
