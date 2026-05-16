import type {
  BaseCategory,
  BaseCustomer,
  BaseMachine,
  BaseMaterial,
  BaseWorker,
  UnifiedGanttItem,
} from "@/types/admin";
import type { WorkOrder, WorkOrderPriority } from "@/types/worker";
import type { WizardCategory, WizardCustomer, WizardMachine, WizardMaterial } from "@/types/wizard";
import type { MachinesCategory, MachinesResource } from "@/features/admin/machines/types";
import type { MaterialCategory, MaterialRow } from "@/features/admin/materials/types";

export function isRecord(u: unknown): u is Record<string, unknown> {
  return u !== null && typeof u === "object" && !Array.isArray(u);
}

function narrowPriority(p: unknown): WorkOrderPriority | null {
  if (p === "URGENT" || p === "HIGH" || p === "NORMAL" || p === "LOW") return p;
  return null;
}

function narrowNumberArray(v: unknown): number[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is number => typeof x === "number");
}

export function narrowBaseWorkers(rows: unknown[]): BaseWorker[] {
  const out: BaseWorker[] = [];
  for (const r of rows) {
    if (!isRecord(r)) continue;
    if (typeof r.id !== "number" || typeof r.fullName !== "string") continue;
    out.push({ id: r.id, fullName: r.fullName });
  }
  return out;
}

export function narrowBaseMachines(rows: unknown[]): BaseMachine[] {
  const out: BaseMachine[] = [];
  for (const r of rows) {
    if (!isRecord(r)) continue;
    if (typeof r.id !== "number" || typeof r.name !== "string") continue;
    const categoryIds = r.categoryIds !== undefined ? narrowNumberArray(r.categoryIds) : undefined;
    out.push({
      id: r.id,
      name: r.name,
      brand: typeof r.brand === "string" ? r.brand : undefined,
      model: typeof r.model === "string" ? r.model : undefined,
      registrationNumber: typeof r.registrationNumber === "string" ? r.registrationNumber : undefined,
      description: r.description === null || typeof r.description === "string" ? (r.description as string | null) : null,
      categoryIds,
      imageUrl: r.imageUrl === null || typeof r.imageUrl === "string" ? (r.imageUrl as string | null) : null,
    });
  }
  return out;
}

export function narrowBaseMaterials(rows: unknown[]): BaseMaterial[] {
  const out: BaseMaterial[] = [];
  for (const r of rows) {
    if (!isRecord(r)) continue;
    if (typeof r.id !== "number" || typeof r.name !== "string") continue;
    const categoryIds = r.categoryIds !== undefined ? narrowNumberArray(r.categoryIds) : undefined;
    out.push({ id: r.id, name: r.name, categoryIds });
  }
  return out;
}

export function narrowBaseCustomers(rows: unknown[]): BaseCustomer[] {
  const out: BaseCustomer[] = [];
  for (const r of rows) {
    if (!isRecord(r)) continue;
    if (typeof r.id !== "number" || typeof r.lastName !== "string") continue;
    const firstName = r.firstName === null || typeof r.firstName === "string" ? (r.firstName as string | null) : null;
    out.push({ id: r.id, firstName, lastName: r.lastName });
  }
  return out;
}

function readBool(r: Record<string, unknown>, k: string, fallback: boolean): boolean {
  return typeof r[k] === "boolean" ? r[k] : fallback;
}

export function narrowBaseCategories(rows: unknown[]): BaseCategory[] {
  const out: BaseCategory[] = [];
  for (const raw of rows) {
    if (!isRecord(raw)) continue;
    if (typeof raw.id !== "number" || typeof raw.name !== "string") continue;
    out.push({
      id: raw.id,
      name: raw.name,
      showCustomer: readBool(raw, "showCustomer", true),
      showMaterial: readBool(raw, "showMaterial", true),
      showQuantity: readBool(raw, "showQuantity", true),
      showTaskDescription: readBool(raw, "showTaskDescription", true),
      reqCustomer: readBool(raw, "reqCustomer", false),
      reqMaterial: readBool(raw, "reqMaterial", false),
      reqQuantity: readBool(raw, "reqQuantity", false),
      reqTaskDescription: readBool(raw, "reqTaskDescription", true),
      isGlobal: readBool(raw, "isGlobal", false),
      isStationary: readBool(raw, "isStationary", false),
      color: raw.color === null || typeof raw.color === "string" ? (raw.color as string | null) : null,
      showResourceName: readBool(raw, "showResourceName", true),
      showResourceDescription: readBool(raw, "showResourceDescription", false),
      showRegistrationNumber: readBool(raw, "showRegistrationNumber", true),
    });
  }
  return out;
}

/** Minimalna walidacja wiersza listy dyspozycji — reszta pól z API (kontrakt serwera). */
export function narrowUnifiedGanttItems(rows: unknown[]): UnifiedGanttItem[] {
  const out: UnifiedGanttItem[] = [];
  for (const row of rows) {
    if (!isRecord(row) || typeof row.id !== "number") continue;
    out.push(row as UnifiedGanttItem);
  }
  return out;
}

export function narrowWorkOrders(rows: unknown[]): WorkOrder[] {
  const out: WorkOrder[] = [];
  for (const r of rows) {
    if (!isRecord(r)) continue;
    if (typeof r.id !== "number" || typeof r.categoryId !== "number" || typeof r.createdAt !== "string") continue;
    const categoryName = r.categoryName === null || typeof r.categoryName === "string" ? r.categoryName : null;
    const taskDescription =
      r.taskDescription === null || typeof r.taskDescription === "string" ? r.taskDescription : null;
    const resourceName = r.resourceName === null || typeof r.resourceName === "string" ? r.resourceName : null;
    const materialName = r.materialName === null || typeof r.materialName === "string" ? r.materialName : null;
    const customerName = r.customerName === null || typeof r.customerName === "string" ? r.customerName : null;
    const dueDate = r.dueDate === null || typeof r.dueDate === "string" ? r.dueDate : null;
    out.push({
      id: r.id,
      categoryId: r.categoryId,
      categoryName,
      taskDescription,
      resourceName,
      materialName,
      customerName,
      priority: narrowPriority(r.priority),
      dueDate,
      createdAt: r.createdAt,
      expectedDurationHours: (() => {
        if (r.expectedDurationHours === null) return null;
        if (typeof r.expectedDurationHours === "number" && Number.isFinite(r.expectedDurationHours)) {
          return r.expectedDurationHours;
        }
        if (typeof r.expectedDurationHours === "string") {
          const n = Number(r.expectedDurationHours);
          return Number.isFinite(n) ? n : null;
        }
        return null;
      })(),
      quantityTons: (() => {
        if (r.quantityTons === null) return null;
        if (typeof r.quantityTons === "number" && Number.isFinite(r.quantityTons)) return r.quantityTons;
        if (typeof r.quantityTons === "string") {
          const n = Number(r.quantityTons);
          return Number.isFinite(n) ? n : null;
        }
        return null;
      })(),
      creatorName:
        r.creatorName === null || typeof r.creatorName === "string" ? (r.creatorName as string | null) : null,
      hasPhotos: typeof r.hasPhotos === "boolean" ? r.hasPhotos : undefined,
      hasNotes: typeof r.hasNotes === "boolean" ? r.hasNotes : undefined,
    });
  }
  return out;
}

export function narrowWizardCategories(rows: unknown[]): WizardCategory[] {
  const out: WizardCategory[] = [];
  for (const raw of rows) {
    if (!isRecord(raw)) continue;
    if (typeof raw.id !== "number" || typeof raw.name !== "string") continue;
    out.push({
      id: raw.id,
      name: raw.name,
      icon: typeof raw.icon === "string" ? raw.icon : undefined,
      showCustomer: readBool(raw, "showCustomer", true),
      showMaterial: readBool(raw, "showMaterial", true),
      showQuantity: readBool(raw, "showQuantity", true),
      showTaskDescription: readBool(raw, "showTaskDescription", true),
      showResourceName: readBool(raw, "showResourceName", true),
      showResourceDescription: readBool(raw, "showResourceDescription", false),
      showRegistrationNumber: readBool(raw, "showRegistrationNumber", true),
      reqCustomer: readBool(raw, "reqCustomer", false),
      reqMaterial: readBool(raw, "reqMaterial", false),
      reqQuantity: readBool(raw, "reqQuantity", false),
      reqTaskDescription: readBool(raw, "reqTaskDescription", true),
      isGlobal: readBool(raw, "isGlobal", false),
      isStationary: readBool(raw, "isStationary", false),
    });
  }
  return out;
}

export function narrowWizardMachines(rows: unknown[]): WizardMachine[] {
  const out: WizardMachine[] = [];
  for (const r of rows) {
    if (!isRecord(r)) continue;
    if (typeof r.id !== "number" || typeof r.name !== "string") continue;
    const categoryIds = narrowNumberArray(r.categoryIds);
    out.push({
      id: r.id,
      name: r.name,
      categoryIds,
      description: r.description === null || typeof r.description === "string" ? (r.description as string | null) : null,
    });
  }
  return out;
}

export function narrowWizardMaterials(rows: unknown[]): WizardMaterial[] {
  return narrowBaseMaterials(rows).map((m) => ({ id: m.id, name: m.name, categoryIds: m.categoryIds }));
}

export function narrowWizardCustomers(rows: unknown[]): WizardCustomer[] {
  return narrowBaseCustomers(rows).map((c) => ({
    id: c.id,
    firstName: c.firstName,
    lastName: c.lastName,
  }));
}

/** Wiersz listy użytkowników (`/api/workers`) w panelu admin. */
export type AdminUserListRow = {
  id: number;
  fullName: string;
  usernameEmail: string;
  role: string;
  isActive: boolean;
  canCreateOwnOrders: boolean;
  canEditRoute: boolean;
};

export function narrowAdminUserRows(rows: unknown[]): AdminUserListRow[] {
  const out: AdminUserListRow[] = [];
  for (const r of rows) {
    if (!isRecord(r)) continue;
    if (
      typeof r.id !== "number" ||
      typeof r.fullName !== "string" ||
      typeof r.usernameEmail !== "string" ||
      typeof r.role !== "string"
    ) {
      continue;
    }
    out.push({
      id: r.id,
      fullName: r.fullName,
      usernameEmail: r.usernameEmail,
      role: r.role,
      isActive: typeof r.isActive === "boolean" ? r.isActive : true,
      canCreateOwnOrders: typeof r.canCreateOwnOrders === "boolean" ? r.canCreateOwnOrders : true,
      canEditRoute: typeof r.canEditRoute === "boolean" ? r.canEditRoute : false,
    });
  }
  return out;
}

/** Wiersz klientów z `/api/customers` (panel admin). */
export type AdminCustomerListRow = {
  id: number;
  firstName: string | null;
  lastName: string;
  defaultAddress: string | null;
  latitude: string | null;
  longitude: string | null;
};

export function narrowAdminCustomerRows(rows: unknown[]): AdminCustomerListRow[] {
  const out: AdminCustomerListRow[] = [];
  for (const r of rows) {
    if (!isRecord(r)) continue;
    if (typeof r.id !== "number" || typeof r.lastName !== "string") continue;
    const firstName = r.firstName === null || typeof r.firstName === "string" ? (r.firstName as string | null) : null;
    const defaultAddress =
      r.defaultAddress === null || typeof r.defaultAddress === "string" ? (r.defaultAddress as string | null) : null;
    const latitude = r.latitude === null || typeof r.latitude === "string" ? (r.latitude as string | null) : null;
    const longitude = r.longitude === null || typeof r.longitude === "string" ? (r.longitude as string | null) : null;
    out.push({
      id: r.id,
      firstName,
      lastName: r.lastName,
      defaultAddress,
      latitude,
      longitude,
    });
  }
  return out;
}

export function narrowMachinesResourceRows(rows: unknown[]): MachinesResource[] {
  const out: MachinesResource[] = [];
  for (const r of rows) {
    if (!isRecord(r)) continue;
    if (typeof r.id !== "number" || typeof r.name !== "string") continue;
    out.push({
      id: r.id,
      name: r.name,
      brand: typeof r.brand === "string" ? r.brand : undefined,
      model: typeof r.model === "string" ? r.model : undefined,
      registrationNumber: typeof r.registrationNumber === "string" ? r.registrationNumber : undefined,
      description: r.description === null || typeof r.description === "string" ? (r.description as string | null) : null,
      categoryIds: narrowNumberArray(r.categoryIds),
      imageUrl: r.imageUrl === null || typeof r.imageUrl === "string" ? (r.imageUrl as string | null) : null,
    });
  }
  return out;
}

export function narrowMachinesCategoryRows(rows: unknown[]): MachinesCategory[] {
  const out: MachinesCategory[] = [];
  for (const raw of rows) {
    if (!isRecord(raw)) continue;
    if (typeof raw.id !== "number" || typeof raw.name !== "string") continue;
    out.push({
      id: raw.id,
      name: raw.name,
      icon: typeof raw.icon === "string" ? raw.icon : undefined,
      showCustomer: readBool(raw, "showCustomer", true),
      showMaterial: readBool(raw, "showMaterial", true),
      showQuantity: readBool(raw, "showQuantity", true),
      showTaskDescription: readBool(raw, "showTaskDescription", true),
      showResourceName: readBool(raw, "showResourceName", true),
      showResourceDescription: readBool(raw, "showResourceDescription", false),
      showRegistrationNumber: readBool(raw, "showRegistrationNumber", true),
      reqCustomer: readBool(raw, "reqCustomer", false),
      reqMaterial: readBool(raw, "reqMaterial", false),
      reqQuantity: readBool(raw, "reqQuantity", false),
      reqTaskDescription: readBool(raw, "reqTaskDescription", true),
      isGlobal: readBool(raw, "isGlobal", false),
      isStationary: readBool(raw, "isStationary", false),
      color: typeof raw.color === "string" ? raw.color : undefined,
    });
  }
  return out;
}

export function narrowMaterialRowRows(rows: unknown[]): MaterialRow[] {
  return narrowBaseMaterials(rows);
}

export function narrowMaterialCategoryRows(rows: unknown[]): MaterialCategory[] {
  const out: MaterialCategory[] = [];
  for (const r of rows) {
    if (!isRecord(r)) continue;
    if (typeof r.id !== "number" || typeof r.name !== "string") continue;
    out.push({
      id: r.id,
      name: r.name,
      color: r.color === null || typeof r.color === "string" ? (r.color as string | null) : null,
    });
  }
  return out;
}
