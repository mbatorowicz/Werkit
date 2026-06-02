import type { SparePart, SparePartInput } from "@/types/dur";



export type SparePartFormState = {

  name: string;

  catalogNumber: string;

  manufacturer: string;

  unit: string;

  purchasePrice: string;

  description: string;

  minStock: string;

  location: string;

  isActive: boolean;

  categoryIds: number[];

  resourceGroupIds: number[];

};



export const EMPTY_SPARE_PART_FORM: SparePartFormState = {

  name: "",

  catalogNumber: "",

  manufacturer: "",

  unit: "szt.",

  purchasePrice: "",

  description: "",

  minStock: "",

  location: "",

  isActive: true,

  categoryIds: [],

  resourceGroupIds: [],

};



export function createEmptySparePartForm(): SparePartFormState {

  return {

    ...EMPTY_SPARE_PART_FORM,

    categoryIds: [],

    resourceGroupIds: [],

  };

}



export function sparePartToFormState(part: SparePart): SparePartFormState {

  const groupIds =

    part.resourceGroupIds?.length ? part.resourceGroupIds : (part.machineCategoryIds ?? []);



  return {

    name: part.name,

    catalogNumber: part.catalogNumber ?? "",

    manufacturer: part.manufacturer ?? "",

    unit: part.unit,

    purchasePrice: part.purchasePrice ?? "",

    description: part.description ?? "",

    minStock: part.minStock ?? "",

    location: part.location ?? "",

    isActive: part.isActive,

    categoryIds: part.categoryIds ?? [],

    resourceGroupIds: groupIds,

  };

}



export function formStateToSparePartInput(
  state: SparePartFormState,
  opts?: { omitPurchasePrice?: boolean }
): SparePartInput {
  return {
    name: state.name.trim(),
    catalogNumber: state.catalogNumber.trim() || undefined,
    manufacturer: state.manufacturer.trim() || undefined,
    unit: state.unit.trim() || "szt.",
    purchasePrice: opts?.omitPurchasePrice
      ? undefined
      : state.purchasePrice.trim()
        ? state.purchasePrice.trim()
        : null,

    description: state.description.trim() || null,

    minStock: state.minStock || undefined,

    location: state.location.trim() || undefined,

    isActive: state.isActive,

    categoryIds: state.categoryIds,

    resourceGroupIds: state.resourceGroupIds,

  };

}


