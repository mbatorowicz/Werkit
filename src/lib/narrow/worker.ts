/** Zawężacze dla modułu pracownika – zlecenia, wizard. */

import type { WorkOrder } from "@/types/worker";
import type { WizardCategory, WizardCustomer, WizardMachine, WizardMaterial } from "@/types/wizard";
import { isRecord, narrowNumberArray, narrowPriority, narrowNullableNumber } from "./shared";
import { narrowBaseCategories, narrowBaseMaterials, narrowBaseCustomers } from "./base";

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
      expectedDurationHours: narrowNullableNumber(r.expectedDurationHours),
      quantityTons: narrowNullableNumber(r.quantityTons),
      creatorName:
        r.creatorName === null || typeof r.creatorName === "string" ? (r.creatorName as string | null) : null,
      hasPhotos: typeof r.hasPhotos === "boolean" ? r.hasPhotos : undefined,
      hasNotes: typeof r.hasNotes === "boolean" ? r.hasNotes : undefined,
    });
  }
  return out;
}

export function narrowWizardCategories(rows: unknown[]): WizardCategory[] {
  const base = narrowBaseCategories(rows);
  return rows
    .filter((r): r is Record<string, unknown> => isRecord(r))
    .map((raw, i) => ({
      ...base[i],
      icon: typeof raw.icon === "string" ? raw.icon : undefined,
    }))
    .filter((_, i) => i < base.length);
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
