"use client";

import { useMemo, useState } from "react";
import { useDictionary } from "@/i18n";
import SessionDetailsModal from "@/components/Admin/Modals/SessionDetailsModal";
import GanttChart from "@/components/GanttChart/GanttChart";
import OrderFormModal from "@/components/Admin/Modals/OrderFormModal";
import { useAdminAbility } from "@/components/Admin/AdminAbilityProvider";
import { useAppDialog, appDialogApiMessage } from "@/components/AppDialogProvider";
import { buildUnifiedDispatchItems } from "@/features/admin/orders/dispatchPlanning";
import { OrdersDispatchToolbar } from "@/components/Admin/Orders/OrdersDispatchToolbar";
import { OrdersDispatchTable } from "@/components/Admin/Orders/OrdersDispatchTable";
import { OrdersSettingsQuickModal } from "@/components/Admin/Orders/OrdersSettingsQuickModal";
import type { DispatchViewMode } from "@/components/Admin/Orders/OrdersDispatchToolbar";
import type { AdminDispatchBootstrap } from "@/types/admin";
import { useOrdersDeepLink } from "@/features/admin/orders/useOrdersDeepLink";
import { useOrdersDispatchData } from "@/features/admin/orders/useOrdersDispatchData";
import { fetchWithDeviceTelemetry } from "@/lib/fetchWithDeviceTelemetry";
import { parseJsonUnknown, readApiErrorString } from "@/lib/parseApiJson";
import { OrdersHeader } from "./OrdersHeader";
import { AdminCollapsibleSection } from "@/components/Admin/AdminCollapsibleSection";
import { OrdersCategoriesPanel } from "@/features/admin/orders/OrdersCategoriesPanel";
import {
  handleDeleteWorkOrder,
  handleForceCompleteSession,
  handleDeleteArchivedSession,
} from "./OrdersMutations";

export default function OrdersClient({
  initialBootstrap = null,
}: {
  initialBootstrap?: AdminDispatchBootstrap | null;
}) {
  const { canMutate, canDelegateOrders, delegationScope } = useAdminAbility();
  const { alert: appAlert } = useAppDialog();

  const dictionary = useDictionary();
  const dict = dictionary.admin.orders;
  const machinesDict = dictionary.admin.machines;
  const navTitle = dictionary.admin.sidebar.dispatch;
  const archiveDict = dictionary.admin.archive;
  const workerUiLabels = dictionary.worker.client;
  const apiErrors = dictionary.apiErrors as Record<string, string>;

  const {
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
  } = useOrdersDispatchData(delegationScope, initialBootstrap);

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
  } = useOrdersDeepLink({
    canMutate: canDelegateOrders,
    orders,
    sessions,
    materials,
    isLoading,
  });

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

  const onDeleteWorkOrder = async (orderId: number) => {
    await handleDeleteWorkOrder(orderId, appAlert, apiErrors, dict, fetchData);
  };

  const onForceCompleteSession = async (sessionId: number) => {
    await handleForceCompleteSession(
      sessionId,
      appAlert,
      apiErrors,
      dict,
      closeSessionDetails,
      fetchData
    );
  };

  const onDeleteArchivedSession = async (sessionId: number, adminPassword: string) => {
    await handleDeleteArchivedSession(
      sessionId,
      adminPassword,
      appAlert,
      apiErrors,
      dict,
      closeSessionDetails,
      fetchData
    );
  };

  const tableColSpan = canMutate ? 3 : 2;

  const unifiedItems = useMemo(
    () => buildUnifiedDispatchItems(orders, sessions, searchQuery),
    [orders, sessions, searchQuery]
  );

  const totalPages = useMemo(() => {
    if (viewMode !== "table") return 1;
    return Math.max(1, Math.ceil(unifiedItems.length / Math.max(1, tableLimit)));
  }, [unifiedItems.length, tableLimit, viewMode]);

  const safePage = Math.min(page, totalPages);

  return (
    <>
      {canMutate ? (
        <div className="mb-4">
          <AdminCollapsibleSection
            title={dictionary.admin.categories.workOrders.panelTitle}
            subtitle={dictionary.admin.categories.workOrders.panelSubtitle}
            defaultOpen={false}
          >
            <OrdersCategoriesPanel
              machinesDict={machinesDict}
              apiErrors={apiErrors}
              canMutate={canMutate}
            />
          </AdminCollapsibleSection>
        </div>
      ) : null}

      <OrdersHeader
        navTitle={navTitle}
        dict={dict}
        canMutate={canDelegateOrders}
        showSettings={canMutate}
        onOpenSettings={(data) => {
          setIsSettingsOpen(true);
          setSettingsData(data);
        }}
        onRefresh={() => fetchData(true)}
        onNewOrder={openNewOrderModal}
      />

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
          onDeleteWorkOrder={onDeleteWorkOrder}
          onForceCompleteSession={onForceCompleteSession}
          onDeleteArchivedSession={onDeleteArchivedSession}
        />
      </div>

      {isOrderModalOpen ? (
        <OrderFormModal
          isOpen={isOrderModalOpen}
          onClose={closeOrderModal}
          onDeletePending={
            canMutate && editingOrderId
              ? async () => {
                  await onDeleteWorkOrder(editingOrderId);
                  closeOrderModal();
                }
              : undefined
          }
          onSave={async (formData, options) => {
            const url = editingOrderId
              ? `/api/admin/work-orders/${editingOrderId}`
              : "/api/admin/work-orders";
            const method = editingOrderId ? "PUT" : "POST";
            const { materialCategoryId: _materialCategoryId, ...rest } = formData;
            const payload = { ...rest, forceSave: Boolean(options?.forceSave) };
            if (payload.dueDate) {
              const due = new Date(payload.dueDate);
              payload.dueDate = Number.isNaN(due.getTime()) ? "" : due.toISOString();
            }
            const res = await fetchWithDeviceTelemetry(
              editingOrderId
                ? `Admin orders: save PUT ${editingOrderId}`
                : "Admin orders: save POST",
              url,
              {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              },
              { category: "admin" }
            );
            if (res.ok) {
              await appAlert({ message: dict.success });
              closeOrderModal();
              fetchData(true);
            } else if (res.status === 409) {
              /* Konflikt harmonogramu — panel inline w modalu; bez dodatkowego alertu. */
            } else {
              const body = await parseJsonUnknown(res);
              const code = readApiErrorString(body);
              await appAlert({ message: appDialogApiMessage(apiErrors, code, dict.error) });
            }
          }}
          editingOrderId={editingOrderId}
          dict={dict}
          workers={workers}
          machines={machines}
          materials={materials}
          materialCategories={materialCategories}
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
          onForceCompleteSession={canMutate ? onForceCompleteSession : undefined}
          onDeleteArchivedSession={canMutate ? onDeleteArchivedSession : undefined}
        />
      ) : null}
    </>
  );
}
