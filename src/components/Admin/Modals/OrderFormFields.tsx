"use client";

import { useMemo } from "react";
import {
  AdminSearchCombobox,
  type AdminSearchComboboxOption,
} from "@/components/Admin/AdminSearchCombobox";
import { CustomerSearchField } from "@/components/customers/CustomerSearchField";
import { comboboxFeedbackProps } from "@/components/searchFieldStyles";
import { buildResourceCanonicalName } from "@/lib/resourceDisplayName";
import { filterResourcesForCategory } from "@/lib/filterResourcesForCategory";
import WorkOrderSparePartsSection from "@/components/Admin/Modals/WorkOrderSparePartsSection";
import type {
  OrderFormState,
  BaseWorker,
  BaseMachine,
  BaseMaterial,
  BaseCustomer,
  BaseCategory,
} from "@/types/admin";
import type { AdminOrdersDict } from "@/components/Admin/Modals/OrderFormModal";

const FIELD = "space-y-1.5";
const LABEL =
  "block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400";
const CONTROL =
  "w-full min-h-[2.75rem] rounded-lg border border-zinc-200 dark:border-zinc-700 bg-[#f2fbfa] dark:bg-zinc-900 px-4 py-2.5 text-sm text-zinc-900 dark:text-white outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 appearance-none";
const TEXTAREA = `${CONTROL} min-h-[6rem] resize-none py-3`;

type Props = {
  form: OrderFormState;
  setForm: (f: OrderFormState) => void;
  dict: AdminOrdersDict;
  categories: BaseCategory[];
  workers: BaseWorker[];
  machines: BaseMachine[];
  materials: BaseMaterial[];
  customers: BaseCustomer[];
  extraCustomers: BaseCustomer[];
  setExtraCustomers: (updater: (prev: BaseCustomer[]) => BaseCustomer[]) => void;
  /** ID zlecenia — wymagane do operacji na częściach (po zapisaniu zlecenia). */
  editingOrderId?: number | null;
};

export function OrderFormFields({
  form,
  setForm,
  dict,
  categories,
  workers,
  machines,
  materials,
  customers,
  extraCustomers,
  setExtraCustomers,
  editingOrderId,
}: Props) {
  const selectedCategory = categories.find((c) => String(c.id) === form.categoryId);
  const orderType = selectedCategory?.orderType ?? null;

  const availableMachines = useMemo(
    () => filterResourcesForCategory(machines, selectedCategory, { whenNoCategory: false }),
    [machines, selectedCategory]
  );

  const noMachinesForCategory = Boolean(selectedCategory) && availableMachines.length === 0;

  const allCustomers = useMemo(() => {
    const byId = new Map(customers.map((c) => [c.id, c]));
    for (const c of extraCustomers) byId.set(c.id, c);
    return [...byId.values()];
  }, [customers, extraCustomers]);

  const categoryOptions: AdminSearchComboboxOption[] = useMemo(
    () => categories.map((c) => ({ id: String(c.id), label: c.name })),
    [categories]
  );

  const workerOptions: AdminSearchComboboxOption[] = useMemo(
    () => workers.map((w) => ({ id: String(w.id), label: w.fullName })),
    [workers]
  );

  const machineOptions: AdminSearchComboboxOption[] = useMemo(
    () =>
      availableMachines.map((m) => {
        const canonical = buildResourceCanonicalName(
          m.brand ?? "",
          m.model ?? "",
          m.registrationNumber ?? "",
          m.description
        );
        return {
          id: String(m.id),
          label: m.name,
          sublabel: canonical && canonical !== m.name ? canonical : undefined,
        };
      }),
    [availableMachines]
  );

  const materialOptions: AdminSearchComboboxOption[] = useMemo(
    () => materials.map((m) => ({ id: String(m.id), label: m.name })),
    [materials]
  );

  const comboboxCommon = comboboxFeedbackProps(dict);

  const materialLabel = selectedCategory?.reqMaterial
    ? dict.chooseMaterialRequired
    : dict.chooseMaterial;
  const customerLabel = selectedCategory?.reqCustomer
    ? dict.chooseCustomerRequired
    : dict.chooseCustomer;

  return (
    <>
      {/* 1. Typ pracy */}
      <div className={FIELD}>
        <label className={LABEL}>{dict.jobType}</label>
        <AdminSearchCombobox
          options={categoryOptions}
          value={form.categoryId}
          onChange={(id) => setForm({ ...form, categoryId: id, resourceId: "" })}
          placeholder={dict.chooseJobTypePlaceholder}
          required
          aria-label={dict.jobType}
          {...comboboxCommon}
        />
        {!selectedCategory ? (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{dict.pickCategoryFirstHint}</p>
        ) : null}
      </div>

      {/* 2. Pracownik */}
      <div className={FIELD}>
        <label className={LABEL}>{dict.chooseWorker}</label>
        <AdminSearchCombobox
          options={workerOptions}
          value={form.userId}
          onChange={(id) => setForm({ ...form, userId: id })}
          placeholder={dict.chooseFromList}
          disabled={!selectedCategory}
          required
          aria-label={dict.chooseWorker}
          {...comboboxCommon}
        />
      </div>

      {/* 3. Maszyna */}
      <div className={FIELD}>
        <label className={LABEL}>{dict.chooseMachine}</label>
        <AdminSearchCombobox
          options={machineOptions}
          value={form.resourceId}
          onChange={(id) => setForm({ ...form, resourceId: id })}
          placeholder={dict.chooseMachinePlaceholder}
          disabled={!selectedCategory || noMachinesForCategory}
          required={Boolean(selectedCategory) && !noMachinesForCategory}
          aria-label={dict.chooseMachine}
          {...comboboxCommon}
        />
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
          <AdminSearchCombobox
            options={materialOptions}
            value={form.materialId}
            onChange={(id) => setForm({ ...form, materialId: id })}
            placeholder={materialLabel}
            required={selectedCategory.reqMaterial}
            aria-label={materialLabel}
            {...comboboxCommon}
          />
        </div>
      ) : null}

      {selectedCategory?.showCustomer ? (
        <CustomerSearchField
          label={customerLabel}
          customers={allCustomers}
          value={form.customerId}
          onChange={(id) => setForm({ ...form, customerId: id })}
          onCustomerCreated={(customer) =>
            setExtraCustomers((prev) => [...prev.filter((c) => c.id !== customer.id), customer])
          }
          required={selectedCategory.reqCustomer}
          dict={dict}
        />
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
              <span className="ml-1 font-normal normal-case text-zinc-400">
                {dict.optionalSuffix}
              </span>
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

      {/* 6. Priorytet */}
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

      {/* 7. Części zamienne — tylko dla napraw */}
      <WorkOrderSparePartsSection
        workOrderId={editingOrderId ?? null}
        orderType={orderType}
        machineCategoryId={form.categoryId ? parseInt(form.categoryId, 10) : null}
      />
    </>
  );
}
