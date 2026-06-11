"use client";

import type { Dispatch, SetStateAction } from "react";
import { DecimalInput } from "@/components/DecimalInput";
import {
  MaterialCategoryMaterialCombobox,
  type MaterialCategoryMaterialComboboxDict,
} from "@/components/materials/MaterialCategoryMaterialCombobox";
import { CustomerSearchField } from "@/components/customers/CustomerSearchField";
import { FIELD, LABEL, CONTROL, TEXTAREA } from "@/components/Admin/Modals/orderFormFieldStyles";
import type {
  OrderFormState,
  BaseMaterial,
  BaseMaterialCategory,
  BaseCustomer,
  BaseCategory,
} from "@/types/admin";
import type { AdminOrdersDict } from "@/components/Admin/Modals/OrderFormModal";

interface OrderFormConditionalFieldsProps {
  form: OrderFormState;
  setForm: Dispatch<SetStateAction<OrderFormState>>;
  dict: AdminOrdersDict;
  selectedCategory: BaseCategory | undefined;
  isRepair: boolean;
  materials: BaseMaterial[];
  materialCategories: BaseMaterialCategory[];
  allCustomers: BaseCustomer[];
  setExtraCustomers: (updater: (prev: BaseCustomer[]) => BaseCustomer[]) => void;
  materialPickerDict: MaterialCategoryMaterialComboboxDict;
  materialLabel: string;
  customerLabel: string;
}

export function OrderFormConditionalFields({
  form,
  setForm,
  dict,
  selectedCategory,
  isRepair,
  materials,
  materialCategories,
  allCustomers,
  setExtraCustomers,
  materialPickerDict,
  materialLabel,
  customerLabel,
}: OrderFormConditionalFieldsProps) {
  return (
    <>
      {selectedCategory?.showMaterial ? (
        <div className={FIELD}>
          <label className={LABEL}>{materialLabel}</label>
          <MaterialCategoryMaterialCombobox
            categories={materialCategories}
            materials={materials}
            materialCategoryId={form.materialCategoryId}
            materialId={form.materialId}
            onMaterialCategoryChange={(materialCategoryId) =>
              setForm((prev) => ({ ...prev, materialCategoryId, materialId: "" }))
            }
            onMaterialChange={(materialId) => setForm((prev) => ({ ...prev, materialId }))}
            dict={materialPickerDict}
            placeholder={form.materialCategoryId ? materialLabel : undefined}
            required={selectedCategory.reqMaterial}
            aria-label={materialLabel}
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
          <DecimalInput
            required={selectedCategory.reqQuantity}
            placeholder={dict.quantityTonsPlaceholder}
            value={form.quantityTons}
            onChange={(v) => setForm({ ...form, quantityTons: v })}
            className={CONTROL}
          />
        </div>
      ) : null}

      {selectedCategory?.showTaskDescription ? (
        <div className={FIELD}>
          <label className={LABEL}>
            {isRepair ? dict.repairDescription : dict.taskDesc}
            {!selectedCategory.reqTaskDescription ? (
              <span className="ml-1 font-normal normal-case text-zinc-400">
                {dict.optionalSuffix}
              </span>
            ) : null}
          </label>
          <textarea
            required={selectedCategory.reqTaskDescription}
            placeholder={isRepair ? dict.repairDescriptionPlaceholder : dict.taskDescPlaceholder}
            value={isRepair ? form.repairDescription : form.taskDescription}
            onChange={(e) =>
              isRepair
                ? setForm({ ...form, repairDescription: e.target.value })
                : setForm({ ...form, taskDescription: e.target.value })
            }
            className={TEXTAREA}
          />
          {!selectedCategory.reqTaskDescription && !isRepair ? (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{dict.taskOptionalHint}</p>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
