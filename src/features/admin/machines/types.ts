export type MachinesCategory = {
  id: number;
  name: string;
  parentId: number | null;
  isGroup: boolean;
  sortOrder: number;
  icon?: string;
  showCustomer: boolean;
  showMaterial: boolean;
  showQuantity: boolean;
  showTaskDescription: boolean;
  showResourceName: boolean;
  showResourceDescription: boolean;
  showRegistrationNumber: boolean;
  reqCustomer: boolean;
  reqMaterial: boolean;
  reqQuantity: boolean;
  reqTaskDescription: boolean;
  isGlobal: boolean;
  isStationary: boolean;
  color?: string;
};

export type MachinesResource = {
  id: number;
  name: string;
  brand?: string;
  model?: string;
  registrationNumber?: string;
  description?: string | null;
  categoryIds: number[];
  imageUrl?: string | null;
};

export type MachineFormState = {
  resourceName: string;
  registrationNumber: string;
  description: string;
  categoryIds: number[];
  imageUrl: string | null;
};

export const EMPTY_MACHINE_FORM: MachineFormState = {
  resourceName: "",
  registrationNumber: "",
  description: "",
  categoryIds: [],
  imageUrl: null,
};

/** Nowa tablica `categoryIds` — unikaj współdzielenia referencji przy resetach. */
export function createEmptyMachineForm(): MachineFormState {
  return { ...EMPTY_MACHINE_FORM, categoryIds: [] };
}

export type CategoryFormState = {
  name: string;
  parentId: number | null;
  isGroup: boolean;
  sortOrder: number;
  icon: string;
  showCustomer: boolean;
  showMaterial: boolean;
  showQuantity: boolean;
  showTaskDescription: boolean;
  reqCustomer: boolean;
  reqMaterial: boolean;
  reqQuantity: boolean;
  reqTaskDescription: boolean;
  isGlobal: boolean;
  isStationary: boolean;
  color: string;
  showResourceName: boolean;
  showResourceDescription: boolean;
  showRegistrationNumber: boolean;
};

export const EMPTY_CATEGORY_FORM: CategoryFormState = {
  name: "",
  parentId: null,
  isGroup: false,
  sortOrder: 0,
  icon: "blue",
  showCustomer: true,
  showMaterial: true,
  showQuantity: true,
  showTaskDescription: true,
  reqCustomer: false,
  reqMaterial: false,
  reqQuantity: false,
  reqTaskDescription: true,
  isGlobal: false,
  isStationary: false,
  color: "#3f3f46",
  showResourceName: true,
  showResourceDescription: false,
  showRegistrationNumber: true,
};
