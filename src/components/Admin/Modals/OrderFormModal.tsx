"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { AdminModalShell } from "@/components/Admin/AdminModalShell";
import { FormModalFooter } from "@/components/FormModalFooter";
import { OrderFormDeletePendingButton } from "./OrderFormDeletePendingButton";
import { WorkOrderScheduleFields } from "@/components/work-orders/WorkOrderScheduleFields";
import { buildWorkOrderScheduleFieldLabels } from "@/components/work-orders/scheduleConflictI18n";
import { useDictionary } from "@/i18n";
import type { AppDictionary } from "@/i18n/types";
import { OrderFormFields } from "@/components/Admin/Modals/OrderFormFields";
import {
  OrderFormState,
  BaseWorker,
  BaseMachine,
  BaseMaterial,
  BaseMaterialCategory,
  BaseCustomer,
  BaseCategory,
} from "@/types/admin";

export type AdminOrdersDict = AppDictionary["admin"]["orders"];

export default function OrderFormModal({
  isOpen,
  onClose,
  onSave,
  editingOrderId,
  dict,
  workers,
  machines,
  materials,
  materialCategories,
  customers,
  categories,
  initialForm,
  onDeletePending,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (form: OrderFormState, options?: { forceSave?: boolean }) => Promise<void>;
  onDeletePending?: () => Promise<void>;
  editingOrderId: number | null;
  dict: AdminOrdersDict;
  workers: BaseWorker[];
  machines: BaseMachine[];
  materials: BaseMaterial[];
  materialCategories: BaseMaterialCategory[];
  customers: BaseCustomer[];
  categories: BaseCategory[];
  initialForm: OrderFormState;
}) {
  const [form, setForm] = useState<OrderFormState>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasConflicts, setHasConflicts] = useState(false);
  const [extraCustomers, setExtraCustomers] = useState<BaseCustomer[]>([]);
  const dictionary = useDictionary();

  useEffect(() => {
    if (!isOpen) return;
    queueMicrotask(() => {
      setForm(initialForm);
      setHasConflicts(false);
      setExtraCustomers([]);
    });
  }, [isOpen, initialForm]);

  const selectedCategory = categories.find((c) => String(c.id) === form.categoryId);

  const availableMachines = useMemo(
    () =>
      selectedCategory
        ? machines.filter((m) => m.categoryIds?.includes(selectedCategory.id) ?? true)
        : [],
    [machines, selectedCategory]
  );

  const noMachinesForCategory = Boolean(selectedCategory) && availableMachines.length === 0;

  const modalTitle =
    editingOrderId != null
      ? dict.modalEditOrderTitle.replace(/\{id\}/g, String(editingOrderId))
      : dict.issueOrder;

  const submitForm = useCallback(
    async (forceSave: boolean) => {
      if (!selectedCategory || noMachinesForCategory) return;
      setIsSubmitting(true);
      try {
        await onSave({ ...form, forceSave }, { forceSave });
      } finally {
        setIsSubmitting(false);
      }
    },
    [form, noMachinesForCategory, onSave, selectedCategory]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitForm(false);
  };

  const scheduleLabels = buildWorkOrderScheduleFieldLabels(dictionary.workOrdersSchedule, {
    mode: "admin",
  });

  return (
    <AdminModalShell
      open={isOpen}
      onClose={onClose}
      title={modalTitle}
      maxWidthClass="max-w-xl"
      titleSize="lg"
      scrollableBody
      closeOnBackdropClick={false}
      footer={
        <FormModalFooter
          formId="admin-order-form"
          onCancel={onClose}
          submitLabel={isSubmitting ? dict.saving : dict.save}
          isSubmitting={isSubmitting}
          submitDisabled={!selectedCategory || noMachinesForCategory || hasConflicts}
          hideSubmit={hasConflicts}
          leading={
            editingOrderId && onDeletePending ? (
              <OrderFormDeletePendingButton
                isSubmitting={isSubmitting}
                setIsSubmitting={setIsSubmitting}
                confirmMessage={dict.deletePendingConfirm}
                label={dict.deletePendingOrderLabel}
                onDeletePending={onDeletePending}
              />
            ) : undefined
          }
        />
      }
    >
      <form id="admin-order-form" onSubmit={handleSubmit} className="space-y-5 p-6">
        <OrderFormFields
          form={form}
          setForm={setForm}
          dict={dict}
          categories={categories}
          workers={workers}
          machines={machines}
          materials={materials}
          materialCategories={materialCategories}
          customers={customers}
          extraCustomers={extraCustomers}
          setExtraCustomers={setExtraCustomers}
          editingOrderId={editingOrderId}
        />

        {/* Czas i termin + panel konfliktów */}
        <WorkOrderScheduleFields
          mode="admin"
          scope="admin"
          userId={form.userId}
          resourceId={form.resourceId}
          dueDate={form.dueDate}
          expectedDurationHours={form.expectedDurationHours}
          onDueDateChange={(value) => setForm({ ...form, dueDate: value })}
          onExpectedDurationHoursChange={(value) =>
            setForm({ ...form, expectedDurationHours: value })
          }
          excludeOrderId={editingOrderId}
          previewEnabled={isOpen}
          labels={scheduleLabels}
          onForceSave={() => void submitForm(true)}
          isSubmitting={isSubmitting}
          onPreviewChange={({ hasConflicts: next }) => setHasConflicts(next)}
        />
      </form>
    </AdminModalShell>
  );
}
