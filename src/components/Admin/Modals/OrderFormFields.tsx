"use client";

import type { Dispatch, SetStateAction } from "react";
import { AdminSearchCombobox } from "@/components/Admin/AdminSearchCombobox";
import { comboboxFeedbackProps } from "@/components/searchFieldStyles";
import { isRepairOrderType } from "@/lib/orderType";
import WorkOrderSparePartsSection from "@/components/Admin/Modals/WorkOrderSparePartsSection";
import { OrderFormConditionalFields } from "@/components/Admin/Modals/OrderFormConditionalFields";
import { useOrderFormFieldOptions } from "@/components/Admin/Modals/useOrderFormFieldOptions";
import { FIELD, LABEL, CONTROL } from "@/components/Admin/Modals/orderFormFieldStyles";
import type {
  OrderFormState,
  BaseWorker,
  BaseMachine,
  BaseMaterial,
  BaseMaterialCategory,
  BaseCustomer,
  BaseCategory,
} from "@/types/admin";
import type { AdminOrdersDict } from "@/components/Admin/Modals/OrderFormModal";

type Props = {
  form: OrderFormState;
  setForm: Dispatch<SetStateAction<OrderFormState>>;
  dict: AdminOrdersDict;
  categories: BaseCategory[];
  workers: BaseWorker[];
  machines: BaseMachine[];
  materials: BaseMaterial[];
  materialCategories: BaseMaterialCategory[];
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
  materialCategories,
  customers,
  extraCustomers,
  setExtraCustomers,
  editingOrderId,
}: Props) {
  const {
    selectedCategory,
    orderType,
    isRepair,
    noMachinesForCategory,
    resourceGroupId,
    allCustomers,
    categoryOptions,
    workerOptions,
    machineOptions,
    materialPickerDict,
    materialLabel,
    customerLabel,
  } = useOrderFormFieldOptions({
    form,
    dict,
    categories,
    workers,
    machines,
    customers,
    extraCustomers,
  });

  const applyCategoryChange = (categoryId: string) => {
    const cat = categories.find((c) => String(c.id) === categoryId);
    const nextType = cat?.orderType ?? "machine_work";
    setForm({
      ...form,
      categoryId,
      resourceId: "",
      orderType: nextType,
      ...(isRepairOrderType(nextType)
        ? { materialCategoryId: "", materialId: "", quantityTons: "" }
        : { materialCategoryId: "", materialId: "" }),
    });
  };

  const comboboxCommon = comboboxFeedbackProps(dict);

  return (
    <>
      {/* 1. Typ pracy */}
      <div className={FIELD}>
        <label className={LABEL}>{dict.jobType}</label>
        <AdminSearchCombobox
          options={categoryOptions}
          value={form.categoryId}
          onChange={applyCategoryChange}
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

      {/* 4-5. Warunkowe: materiał, klient, ilość, opis */}
      <OrderFormConditionalFields
        form={form}
        setForm={setForm}
        dict={dict}
        selectedCategory={selectedCategory}
        isRepair={isRepair}
        materials={materials}
        materialCategories={materialCategories}
        allCustomers={allCustomers}
        setExtraCustomers={setExtraCustomers}
        materialPickerDict={materialPickerDict}
        materialLabel={materialLabel}
        customerLabel={customerLabel}
      />

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
        resourceGroupId={resourceGroupId}
      />
    </>
  );
}
