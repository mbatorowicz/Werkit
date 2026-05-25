/** Zawężacze dla modułu maszyn i materiałów (admin). */

import type { MachinesCategory, MachinesResource } from "@/features/admin/machines/types";
import type { MaterialCategory, MaterialRow } from "@/features/admin/materials/types";
import { isRecord, narrowNumberArray, readBool } from "./shared";
import { narrowBaseMaterials } from "./base";

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
      parentId: typeof raw.parentId === "number" ? raw.parentId : null,
      isGroup: readBool(raw, "isGroup", false),
      sortOrder: typeof raw.sortOrder === "number" ? raw.sortOrder : 0,
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
      parentId: typeof r.parentId === "number" ? r.parentId : null,
      isGroup: readBool(r, "isGroup", false),
      sortOrder: typeof r.sortOrder === "number" ? r.sortOrder : 0,
      color: r.color === null || typeof r.color === "string" ? (r.color as string | null) : null,
    });
  }
  return out;
}
