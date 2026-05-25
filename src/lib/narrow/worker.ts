/** Zawężacze dla modułu pracownika – zlecenia, wizard. */

import type { WorkOrder } from "@/types/worker";
import type { WizardCategory, WizardCustomer, WizardMachine, WizardMaterial } from "@/types/wizard";
import { isRecord, narrowNumberArray, readBool, narrowPriority } from "./shared";
import { narrowBaseMaterials, narrowBaseCustomers } from "./base";

export function narrowWorkOrders(rows: unknown[]): WorkOrder[] {
  const out: WorkOrder[] = [];
  for (const r of rows) {
    if (!isRecord(r)) continue;
    if (typeof r.id !== "number" || typeof r.categoryId !== "number" || typeof r.createdAt !== "string") continue;
    const categoryName = r.categoryName === null || typeof r.categoryName === "string" ? r.categoryName : null;
    const taskDescription =
      r.taskDescription === null || typeof r.taskDescription === "string" ? r.taskDescription : null;
    const resourceName = r.resourceName === null || typeof r.resourceName === "string" ? r.resourceName : null;
    const resourceId = typeof r.resourceId === "number" ? r.resourceId : null;
    const userId = typeof r.userId === "number" ? r.userId : null;
    const materialName = r.materialName === null || typeof r.materialName === "string" ? r.materialName : null;
    const customerName = r.customerName === null || typeof r.customerName === "string" ? r.customerName : null;
    const dueDate = r.dueDate === null || typeof r.dueDate === "string" ? r.dueDate : null;
    out.push({
      id: r.id,
      categoryId: r.categoryId,
      categoryName,
      taskDescription,
      resourceName,
      resourceId,
      userId,
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
    defaultAddress: c.defaultAddress,
    locationAddresses: c.locationAddresses,
  }));
}
