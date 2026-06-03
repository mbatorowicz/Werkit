/** Dane pomocnicze API kreatora zlecenia własnego (/worker/wizard). */

import type { OrderType } from "@/types/worker";

export type WizardCategory = {
  id: number;
  name: string;
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
  /** Z API `/api/categories` — tryb stacjonarny (warsztat / plac). */
  isStationary?: boolean;
  orderType: OrderType;
};

export type WizardMachine = {
  id: number;
  name: string;
  categoryIds: number[];
  description?: string | null;
};

export type WizardMaterial = { id: number; name: string; categoryIds?: number[] };

export type WizardMaterialCategory = { id: number; name: string; color?: string | null };

export type WizardCustomer = {
  id: number;
  firstName: string | null;
  lastName: string;
  defaultAddress?: string | null;
  locationAddresses?: string[];
};
