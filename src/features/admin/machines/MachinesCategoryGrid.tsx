"use client";

import type { CategoryFormState, MachinesCategory } from "./types";

export function categoryToForm(cat: MachinesCategory): CategoryFormState {
  return {
    name: cat.name,
    parentId: cat.parentId,
    isGroup: cat.isGroup,
    sortOrder: cat.sortOrder,
    icon: cat.icon || "blue",
    showCustomer: cat.showCustomer,
    showMaterial: cat.showMaterial,
    showQuantity: cat.showQuantity,
    showTaskDescription: cat.showTaskDescription,
    reqCustomer: cat.reqCustomer,
    reqMaterial: cat.reqMaterial,
    reqQuantity: cat.reqQuantity,
    reqTaskDescription: cat.reqTaskDescription,
    isGlobal: cat.isGlobal,
    isStationary: cat.isStationary,
    color: cat.color || "#3f3f46",
    showResourceName: cat.showResourceName !== false,
    showResourceDescription: Boolean(cat.showResourceDescription),
    showRegistrationNumber: cat.showRegistrationNumber !== false,
  };
}
