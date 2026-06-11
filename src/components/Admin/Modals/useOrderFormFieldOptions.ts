"use client";

import { useMemo } from "react";
import { type AdminSearchComboboxOption } from "@/components/Admin/AdminSearchCombobox";
import { type MaterialCategoryMaterialComboboxDict } from "@/components/materials/MaterialCategoryMaterialCombobox";
import { buildResourceCanonicalName } from "@/lib/resourceDisplayName";
import { filterResourcesForCategory } from "@/lib/filterResourcesForCategory";
import { isRepairOrderType } from "@/lib/orderType";
import type { OrderType } from "@/types/worker";
import type {
  OrderFormState,
  BaseWorker,
  BaseMachine,
  BaseCustomer,
  BaseCategory,
} from "@/types/admin";
import type { AdminOrdersDict } from "@/components/Admin/Modals/OrderFormModal";

interface UseOrderFormFieldOptionsParams {
  form: OrderFormState;
  dict: AdminOrdersDict;
  categories: BaseCategory[];
  workers: BaseWorker[];
  machines: BaseMachine[];
  customers: BaseCustomer[];
  extraCustomers: BaseCustomer[];
}

export function useOrderFormFieldOptions({
  form,
  dict,
  categories,
  workers,
  machines,
  customers,
  extraCustomers,
}: UseOrderFormFieldOptionsParams) {
  const selectedCategory = categories.find((c) => String(c.id) === form.categoryId);
  const orderType: OrderType = form.orderType ?? selectedCategory?.orderType ?? "machine_work";
  const isRepair = isRepairOrderType(orderType);

  const availableMachines = useMemo(
    () => filterResourcesForCategory(machines, selectedCategory, { whenNoCategory: false }),
    [machines, selectedCategory]
  );

  const noMachinesForCategory = Boolean(selectedCategory) && availableMachines.length === 0;

  const resourceGroupId = useMemo(() => {
    const rid = form.resourceId ? parseInt(form.resourceId, 10) : NaN;
    if (Number.isNaN(rid)) return null;
    const machine = machines.find((m) => m.id === rid);
    return machine?.resourceGroupId ?? null;
  }, [form.resourceId, machines]);

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
    () =>
      workers.map((w) => ({
        id: String(w.id),
        label: w.fullName,
        sublabel: w.orgLabel ?? undefined,
      })),
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

  const materialPickerDict: MaterialCategoryMaterialComboboxDict = useMemo(
    () => ({
      chooseCategory: dict.materialPickerChooseCategory,
      searchMaterial: dict.materialPickerSearchMaterial,
      noCategories: dict.materialPickerNoCategories,
      noMaterialsInCategory: dict.materialPickerNoMaterialsInCategory,
      clearCategory: dict.materialPickerClearCategory,
      clear: dict.searchClear,
      noResults: dict.searchNoResults,
    }),
    [dict]
  );

  const materialLabel = selectedCategory?.reqMaterial
    ? dict.chooseMaterialRequired
    : dict.chooseMaterial;
  const customerLabel = selectedCategory?.reqCustomer
    ? dict.chooseCustomerRequired
    : dict.chooseCustomer;

  return {
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
  };
}
