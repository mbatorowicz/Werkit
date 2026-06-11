"use client";

import SessionDetailsModal from "@/components/Admin/Modals/SessionDetailsModal";
import OrderFormModal from "@/components/Admin/Modals/OrderFormModal";
import { OrdersSettingsQuickModal } from "@/components/Admin/Orders/OrdersSettingsQuickModal";
import type { AppDictionary } from "@/i18n/types";
import type {
  BaseCategory,
  BaseCustomer,
  BaseMachine,
  BaseMaterial,
  BaseMaterialCategory,
  BaseWorker,
  OrderFormState,
  UnifiedGanttItem,
} from "@/types/admin";

interface OrdersDispatchModalsProps {
  dict: AppDictionary["admin"]["orders"];
  canMutate: boolean;
  workers: BaseWorker[];
  machines: BaseMachine[];
  materials: BaseMaterial[];
  materialCategories: BaseMaterialCategory[];
  customers: BaseCustomer[];
  categories: BaseCategory[];
  isOrderModalOpen: boolean;
  closeOrderModal: () => void;
  editingOrderId: number | null;
  orderFormInitial: OrderFormState;
  onSaveOrder: (form: OrderFormState, options?: { forceSave?: boolean }) => Promise<void>;
  onDeleteWorkOrder: (id: number) => Promise<void>;
  selectedDispatchItem: UnifiedGanttItem | null;
  closeSessionDetails: () => void;
  handleEditOrder: (item: UnifiedGanttItem) => void;
  onForceCompleteSession: (sessionId: number) => Promise<void>;
  onDeleteArchivedSession: (sessionId: number, adminPassword: string) => Promise<void>;
  isSettingsOpen: boolean;
  onCloseSettings: () => void;
  settingsData: unknown;
}

export function OrdersDispatchModals({
  dict,
  canMutate,
  workers,
  machines,
  materials,
  materialCategories,
  customers,
  categories,
  isOrderModalOpen,
  closeOrderModal,
  editingOrderId,
  orderFormInitial,
  onSaveOrder,
  onDeleteWorkOrder,
  selectedDispatchItem,
  closeSessionDetails,
  handleEditOrder,
  onForceCompleteSession,
  onDeleteArchivedSession,
  isSettingsOpen,
  onCloseSettings,
  settingsData,
}: OrdersDispatchModalsProps) {
  return (
    <>
      <OrdersSettingsQuickModal
        isOpen={isSettingsOpen}
        onClose={onCloseSettings}
        settingsData={settingsData}
        title={dict.settingsModalTitle}
      />

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
          onSave={onSaveOrder}
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
