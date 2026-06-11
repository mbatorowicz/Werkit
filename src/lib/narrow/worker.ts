/** Zawężacze dla modułu pracownika – zlecenia, wizard. */

import type { WorkOrder } from "@/types/worker";
import type { WizardCategory, WizardCustomer, WizardMachine, WizardMaterial } from "@/types/wizard";
import { narrowOrderType } from "@/lib/orderType";
import { isRecord, narrowNumberArray, narrowPriority, narrowNullableNumber } from "./shared";
import { narrowBaseCategories, narrowBaseMaterials, narrowBaseCustomers } from "./base";

/** string lub null; inne wartości → null. */
function stringOrNull(v: unknown): string | null {
  return v === null || typeof v === "string" ? v : null;
}

function numberOrNull(v: unknown): number | null {
  return typeof v === "number" ? v : null;
}

function booleanOrUndefined(v: unknown): boolean | undefined {
  return typeof v === "boolean" ? v : undefined;
}

export function narrowWorkOrders(rows: unknown[]): WorkOrder[] {
  const out: WorkOrder[] = [];
  for (const r of rows) {
    if (!isRecord(r)) continue;
    if (
      typeof r.id !== "number" ||
      typeof r.categoryId !== "number" ||
      typeof r.createdAt !== "string"
    )
      continue;
    out.push({
      id: r.id,
      categoryId: r.categoryId,
      categoryName: stringOrNull(r.categoryName),
      categoryColor: stringOrNull(r.categoryColor),
      categoryShowMaterial: booleanOrUndefined(r.categoryShowMaterial),
      categoryShowCustomer: booleanOrUndefined(r.categoryShowCustomer),
      categoryShowQuantity: booleanOrUndefined(r.categoryShowQuantity),
      categoryShowTaskDescription: booleanOrUndefined(r.categoryShowTaskDescription),
      taskDescription: stringOrNull(r.taskDescription),
      resourceName: stringOrNull(r.resourceName),
      resourceId: numberOrNull(r.resourceId),
      userId: numberOrNull(r.userId),
      materialName: stringOrNull(r.materialName),
      customerName: stringOrNull(r.customerName),
      customerPhone: stringOrNull(r.customerPhone),
      customerAddress: stringOrNull(r.customerAddress),
      priority: narrowPriority(r.priority),
      dueDate: stringOrNull(r.dueDate),
      createdAt: r.createdAt,
      expectedDurationHours: narrowNullableNumber(r.expectedDurationHours),
      quantityTons: narrowNullableNumber(r.quantityTons),
      creatorName: stringOrNull(r.creatorName),
      hasPhotos: booleanOrUndefined(r.hasPhotos),
      hasNotes: booleanOrUndefined(r.hasNotes),
      orderType: narrowOrderType(r.orderType),
      repairDescription: stringOrNull(r.repairDescription),
      createdById: narrowNullableNumber(r.createdById),
      materialId: narrowNullableNumber(r.materialId),
      customerId: narrowNullableNumber(r.customerId),
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
      description:
        r.description === null || typeof r.description === "string"
          ? (r.description as string | null)
          : null,
    });
  }
  return out;
}

export function narrowWizardMaterials(rows: unknown[]): WizardMaterial[] {
  return narrowBaseMaterials(rows).map((m) => ({
    id: m.id,
    name: m.name,
    categoryIds: m.categoryIds,
  }));
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
