import { WORKER_PERMISSION_DEFAULTS } from "@/lib/workerUserPermissions";

/** Wartość comboboxa „brak wyboru” — nie używać pustego stringa (filtr w AdminSearchCombobox). */
export const COMBO_NONE = "__none__";

export interface UserFormState {
  fullName: string;
  phone: string;
  usernameEmail: string;
  password: string;
  role: string;
  canCreateOwnOrders: boolean;
  canEditRoute: boolean;
  canCreateCustomers: boolean;
  isDurWorker: boolean;
  reportsToId: string;
  departmentId: string;
  teamId: string;
}

export const emptyUserForm = (): UserFormState => ({
  fullName: "",
  phone: "",
  usernameEmail: "",
  password: "",
  role: "worker",
  reportsToId: COMBO_NONE,
  departmentId: COMBO_NONE,
  teamId: COMBO_NONE,
  ...WORKER_PERMISSION_DEFAULTS,
});
