"use client";

import { useMemo } from "react";
import { useDictionary } from "@/i18n";
import GanttChart from "@/components/GanttChart/GanttChart";
import { useAdminAbility } from "@/components/Admin/AdminAbilityProvider";
import { buildUnifiedDispatchItems } from "@/features/admin/orders/dispatchPlanning";
import { OrdersDispatchToolbar } from "@/components/Admin/Orders/OrdersDispatchToolbar";
import { OrdersDispatchTable } from "@/components/Admin/Orders/OrdersDispatchTable";
import type { AppDictionary } from "@/i18n/types";
import type { AdminDispatchBootstrap } from "@/types/admin";
import { useOrdersDeepLink } from "@/features/admin/orders/useOrdersDeepLink";
import { useOrdersDispatchData } from "@/features/admin/orders/useOrdersDispatchData";
import { useOrdersViewState } from "@/features/admin/orders/useOrdersViewState";
import { useOrdersActions } from "@/features/admin/orders/useOrdersActions";
import { OrdersDispatchModals } from "@/features/admin/orders/OrdersDispatchModals";
import { OrdersHeader } from "./OrdersHeader";
import { AdminCollapsibleSection } from "@/components/Admin/AdminCollapsibleSection";
import { OrdersCategoriesPanel } from "@/features/admin/orders/OrdersCategoriesPanel";

function OrdersCategoriesSection({
  dictionary,
  apiErrors,
  canMutate,
}: {
  dictionary: AppDictionary;
  apiErrors: Record<string, string>;
  canMutate: boolean;
}) {
  return (
    <div className="mb-4">
      <AdminCollapsibleSection
        title={dictionary.admin.categories.workOrders.panelTitle}
        subtitle={dictionary.admin.categories.workOrders.panelSubtitle}
        defaultOpen={false}
      >
        <OrdersCategoriesPanel
          machinesDict={dictionary.admin.machines}
          apiErrors={apiErrors}
          canMutate={canMutate}
        />
      </AdminCollapsibleSection>
    </div>
  );
}

export default function OrdersClient({
  initialBootstrap = null,
}: {
  initialBootstrap?: AdminDispatchBootstrap | null;
}) {
  const { canMutate, canDelegateOrders, delegationScope } = useAdminAbility();

  const dictionary = useDictionary();
  const dict = dictionary.admin.orders;
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

  const view = useOrdersViewState();

  const actions = useOrdersActions({
    dict,
    apiErrors,
    editingOrderId,
    closeOrderModal,
    closeSessionDetails,
    fetchData,
  });

  const tableColSpan = canMutate ? 3 : 2;

  const unifiedItems = useMemo(
    () => buildUnifiedDispatchItems(orders, sessions, view.searchQuery),
    [orders, sessions, view.searchQuery]
  );

  const totalPages = useMemo(() => {
    if (view.viewMode !== "table") return 1;
    return Math.max(1, Math.ceil(unifiedItems.length / Math.max(1, view.tableLimit)));
  }, [unifiedItems.length, view.tableLimit, view.viewMode]);

  const safePage = Math.min(view.page, totalPages);

  return (
    <>
      {canMutate ? (
        <OrdersCategoriesSection dictionary={dictionary} apiErrors={apiErrors} canMutate />
      ) : null}

      <OrdersHeader
        navTitle={navTitle}
        dict={dict}
        canMutate={canDelegateOrders}
        showSettings={canMutate}
        onOpenSettings={(data) => {
          view.setIsSettingsOpen(true);
          view.setSettingsData(data);
        }}
        onRefresh={() => fetchData(true)}
        onNewOrder={openNewOrderModal}
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
          searchQuery={view.searchQuery}
          onSearchChange={view.setSearchQueryAndResetPage}
          tableLimit={view.tableLimit}
          onTableLimitChange={view.setTableLimitAndResetPage}
          viewMode={view.viewMode}
          onViewModeChange={view.setViewModePersisted}
          page={safePage}
          totalPages={totalPages}
          onPageChange={view.setPage}
        />
        <OrdersDispatchTable
          ordersDict={dict}
          archiveDict={archiveDict}
          workerUiLabels={workerUiLabels}
          canMutate={canMutate}
          isLoading={isLoading}
          tableColSpan={tableColSpan}
          tableLimit={view.tableLimit}
          unifiedItems={unifiedItems}
          viewMode={view.viewMode}
          page={safePage}
          onRowClick={onDispatchItemClick}
          onDeleteWorkOrder={actions.onDeleteWorkOrder}
          onForceCompleteSession={actions.onForceCompleteSession}
          onDeleteArchivedSession={actions.onDeleteArchivedSession}
        />
      </div>

      <OrdersDispatchModals
        dict={dict}
        canMutate={canMutate}
        workers={workers}
        machines={machines}
        materials={materials}
        materialCategories={materialCategories}
        customers={customers}
        categories={categories}
        isOrderModalOpen={isOrderModalOpen}
        closeOrderModal={closeOrderModal}
        editingOrderId={editingOrderId}
        orderFormInitial={orderFormInitial}
        onSaveOrder={actions.handleSaveOrder}
        onDeleteWorkOrder={actions.onDeleteWorkOrder}
        selectedDispatchItem={selectedDispatchItem}
        closeSessionDetails={closeSessionDetails}
        handleEditOrder={handleEditOrder}
        onForceCompleteSession={actions.onForceCompleteSession}
        onDeleteArchivedSession={actions.onDeleteArchivedSession}
        isSettingsOpen={view.isSettingsOpen}
        onCloseSettings={() => view.setIsSettingsOpen(false)}
        settingsData={view.settingsData}
      />
    </>
  );
}
