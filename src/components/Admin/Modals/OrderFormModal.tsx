"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";

import { AdminModalShell } from "@/components/Admin/AdminModalShell";
import { FormModalFooter } from "@/components/FormModalFooter";
import { useAppDialog } from "@/components/AppDialogProvider";
import type { AppDictionary } from "@/i18n/types";
import {
  OrderFormState,
  BaseWorker,
  BaseMachine,
  BaseMaterial,
  BaseCustomer,
  BaseCategory,
} from "@/types/admin";

const FIELD = "space-y-1.5";
const LABEL =
  "block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400";
const CONTROL =
  "w-full min-h-[2.75rem] rounded-lg border border-zinc-200 dark:border-zinc-700 bg-[#f2fbfa] dark:bg-zinc-900 px-4 py-2.5 text-sm text-zinc-900 dark:text-white outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 appearance-none";
const TEXTAREA = `${CONTROL} min-h-[6rem] resize-none py-3`;

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
  customers,
  categories,
  initialForm,
  onDeletePending,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (form: OrderFormState) => Promise<void>;
  /** Usuwa oczekujące zlecenie (tylko edycja). */
  onDeletePending?: () => Promise<void>;
  editingOrderId: number | null;
  dict: AdminOrdersDict;
  workers: BaseWorker[];
  machines: BaseMachine[];
  materials: BaseMaterial[];
  customers: BaseCustomer[];
  categories: BaseCategory[];
  initialForm: OrderFormState;
}) {
  const [form, setForm] = useState<OrderFormState>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { confirm: appConfirm } = useAppDialog();

  useEffect(() => {
    if (!isOpen) return;
    queueMicrotask(() => setForm(initialForm));
  }, [isOpen, initialForm]);

  const selectedCategory = categories.find((c) => String(c.id) === form.categoryId);

  const availableMachines = machines.filter((m) => {
    if (!selectedCategory) return false;
    if (selectedCategory.isGlobal) return true;
    return m.categoryIds?.includes(selectedCategory.id) ?? false;
  });

  const noMachinesForCategory = Boolean(selectedCategory) && availableMachines.length === 0;

  const modalTitle =
    editingOrderId != null
      ? dict.modalEditOrderTitle.replace(/\{id\}/g, String(editingOrderId))
      : dict.issueOrder;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory || noMachinesForCategory) return;
    setIsSubmitting(true);
    try {
      await onSave(form);
    } finally {
      setIsSubmitting(false);
    }
  };

  const materialLabel = selectedCategory?.reqMaterial ? dict.chooseMaterialRequired : dict.chooseMaterial;
  const customerLabel = selectedCategory?.reqCustomer ? dict.chooseCustomerRequired : dict.chooseCustomer;

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
          submitDisabled={!selectedCategory || noMachinesForCategory}
          submitClassName="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-500 transition disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center min-w-[7rem]"
          leading={
            editingOrderId && onDeletePending ? (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={async () => {
                  const msg = dict.deletePendingConfirm;
                  if (!msg || !(await appConfirm({ message: msg, variant: "danger" }))) return;
                  setIsSubmitting(true);
                  try {
                    await onDeletePending();
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
                className="w-full flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-500/10 py-3 font-semibold text-red-700 transition hover:bg-red-500/15 active:scale-[0.98] disabled:opacity-50 dark:border-red-500/30 dark:text-red-400"
              >
                <Trash2 className="h-4 w-4 shrink-0" />
                {dict.deletePendingOrderLabel}
              </button>
            ) : undefined
          }
        />
      }
    >
      <form id="admin-order-form" onSubmit={handleSubmit} className="space-y-5 p-6">
        {/* 1. Typ pracy */}
        <div className={FIELD}>
          <label className={LABEL}>{dict.jobType}</label>
          <select
            required
            value={form.categoryId}
            onChange={(e) => setForm({ ...form, categoryId: e.target.value, resourceId: "" })}
            className={CONTROL}
          >
            <option value="" disabled>
              {dict.chooseJobTypePlaceholder}
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {!selectedCategory ? (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{dict.pickCategoryFirstHint}</p>
          ) : null}
        </div>

        {/* 2. Pracownik */}
        <div className={FIELD}>
          <label className={LABEL}>{dict.chooseWorker}</label>
          <select
            required
            disabled={!selectedCategory}
            value={form.userId}
            onChange={(e) => setForm({ ...form, userId: e.target.value })}
            className={`${CONTROL} disabled:cursor-not-allowed disabled:opacity-50`}
          >
            <option value="" disabled>
              {dict.chooseFromList}
            </option>
            {workers.map((w) => (
              <option key={w.id} value={w.id}>
                {w.fullName}
              </option>
            ))}
          </select>
        </div>

        {/* 3. Maszyna */}
        <div className={FIELD}>
          <label className={LABEL}>{dict.chooseMachine}</label>
          <select
            required={Boolean(selectedCategory) && !noMachinesForCategory}
            disabled={!selectedCategory || noMachinesForCategory}
            value={form.resourceId}
            onChange={(e) => setForm({ ...form, resourceId: e.target.value })}
            className={`${CONTROL} disabled:cursor-not-allowed disabled:opacity-50`}
          >
            <option value="" disabled>
              {dict.chooseMachinePlaceholder}
            </option>
            {availableMachines.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          {noMachinesForCategory ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
              {dict.noMachinesForCategory}
            </p>
          ) : null}
        </div>

        {/* 4. Warunkowe: materiał, klient, ilość */}
        {selectedCategory?.showMaterial ? (
          <div className={FIELD}>
            <label className={LABEL}>{materialLabel}</label>
            <select
              required={selectedCategory.reqMaterial}
              value={form.materialId}
              onChange={(e) => setForm({ ...form, materialId: e.target.value })}
              className={CONTROL}
            >
              <option value="" disabled>
                {materialLabel}
              </option>
              {materials.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {selectedCategory?.showCustomer ? (
          <div className={FIELD}>
            <label className={LABEL}>{customerLabel}</label>
            <select
              required={selectedCategory.reqCustomer}
              value={form.customerId}
              onChange={(e) => setForm({ ...form, customerId: e.target.value })}
              className={CONTROL}
            >
              <option value="" disabled>
                {customerLabel}
              </option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.lastName} {c.firstName}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {selectedCategory?.showQuantity ? (
          <div className={FIELD}>
            <label className={LABEL}>{dict.quantityTonsLabel}</label>
            <input
              required={selectedCategory.reqQuantity}
              type="number"
              step="0.01"
              min="0"
              placeholder={dict.quantityTonsPlaceholder}
              value={form.quantityTons}
              onChange={(e) => setForm({ ...form, quantityTons: e.target.value })}
              className={CONTROL}
            />
          </div>
        ) : null}

        {/* 5. Opis — tylko po wyborze kategorii */}
        {selectedCategory && selectedCategory.showTaskDescription ? (
          <div className={FIELD}>
            <label className={LABEL}>
              {dict.taskDesc}
              {!selectedCategory.reqTaskDescription ? (
                <span className="ml-1 font-normal normal-case text-zinc-400">{dict.optionalSuffix}</span>
              ) : null}
            </label>
            <textarea
              required={selectedCategory.reqTaskDescription}
              placeholder={dict.taskDescPlaceholder}
              value={form.taskDescription}
              onChange={(e) => setForm({ ...form, taskDescription: e.target.value })}
              className={TEXTAREA}
            />
            {!selectedCategory.reqTaskDescription ? (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{dict.taskOptionalHint}</p>
            ) : null}
          </div>
        ) : null}

        {/* 6. Czas i termin */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className={FIELD}>
            <label className={LABEL}>{dict.expectedDurationLabel}</label>
            <input
              type="number"
              step="0.5"
              min="0"
              placeholder={dict.expectedDurationPlaceholder}
              value={form.expectedDurationHours}
              onChange={(e) => setForm({ ...form, expectedDurationHours: e.target.value })}
              className={CONTROL}
            />
          </div>
          <div className={FIELD}>
            <label className={LABEL}>{dict.dueDateOptionalLabel}</label>
            <input
              type="datetime-local"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              className={CONTROL}
            />
          </div>
        </div>

        {/* 7. Priorytet */}
        <div className={FIELD}>
          <label className={LABEL}>{dict.priorityLabel}</label>
          <select
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: e.target.value })}
            className={CONTROL}
          >
            <option value="LOW">{dict.priorityLow}</option>
            <option value="NORMAL">{dict.priorityNormal}</option>
            <option value="HIGH">{dict.priorityHigh}</option>
            <option value="URGENT">{dict.priorityUrgent}</option>
          </select>
        </div>

        {/* 8. Wymuś zapis */}
        <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50/80 p-3 dark:border-emerald-500/25 dark:bg-emerald-500/10">
          <input
            type="checkbox"
            id="forceSave"
            checked={form.forceSave}
            onChange={(e) => setForm({ ...form, forceSave: e.target.checked })}
            className="mt-0.5 h-4 w-4 cursor-pointer rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500 dark:border-zinc-600 dark:bg-zinc-800"
          />
          <label
            htmlFor="forceSave"
            className="cursor-pointer select-none text-sm font-medium text-emerald-900 dark:text-emerald-300"
          >
            {dict.forceSaveScheduleLabel}
          </label>
        </div>

      </form>
    </AdminModalShell>
  );
}
