/** Podstawowe zawężacze dla typów współdzielonych (worker, machine, material, customer, category). */

import type {
  BaseCategory,
  BaseCustomer,
  BaseMachine,
  BaseMaterial,
  BaseWorker,
} from "@/types/admin";
import { isRecord, narrowNumberArray, narrowStringArray, readBool } from "./shared";

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
      registrationNumber:
        typeof r.registrationNumber === "string" ? r.registrationNumber : undefined,
      description:
        r.description === null || typeof r.description === "string"
          ? (r.description as string | null)
          : null,
      categoryIds,
      imageUrl:
        r.imageUrl === null || typeof r.imageUrl === "string"
          ? (r.imageUrl as string | null)
          : null,
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
    const firstName =
      r.firstName === null || typeof r.firstName === "string"
        ? (r.firstName as string | null)
        : null;
    const defaultAddress =
      r.defaultAddress === null || typeof r.defaultAddress === "string"
        ? (r.defaultAddress as string | null)
        : null;
    const locationAddresses = narrowStringArray(r.locationAddresses);
    out.push({
      id: r.id,
      firstName,
      lastName: r.lastName,
      defaultAddress,
      ...(locationAddresses.length > 0 ? { locationAddresses } : {}),
    });
  }
  return out;
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
      color:
        raw.color === null || typeof raw.color === "string" ? (raw.color as string | null) : null,
      showResourceName: readBool(raw, "showResourceName", true),
      showResourceDescription: readBool(raw, "showResourceDescription", false),
      showRegistrationNumber: readBool(raw, "showRegistrationNumber", true),
    });
  }
  return out;
}
