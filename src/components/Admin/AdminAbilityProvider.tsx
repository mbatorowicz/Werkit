"use client";

import { createContext, useContext } from "react";

export type DelegationScope = "all" | "scoped" | "none";

type AdminAbilityContextValue = {
  canMutate: boolean;
  /** Tworzenie/edycja zleceń (pełny admin lub lider/kierownik). */
  canDelegateOrders: boolean;
  delegationScope: DelegationScope;
  gpsEnabled: boolean;
  durEnabled: boolean;
};

const AdminAbilityContext = createContext<AdminAbilityContextValue>({
  canMutate: false,
  canDelegateOrders: false,
  delegationScope: "none",
  gpsEnabled: true,
  durEnabled: false,
});

export function AdminAbilityProvider({
  canMutate,
  canDelegateOrders,
  delegationScope,
  gpsEnabled,
  durEnabled,
  children,
}: {
  canMutate: boolean;
  canDelegateOrders: boolean;
  delegationScope: DelegationScope;
  gpsEnabled: boolean;
  durEnabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <AdminAbilityContext.Provider
      value={{ canMutate, canDelegateOrders, delegationScope, gpsEnabled, durEnabled }}
    >
      {children}
    </AdminAbilityContext.Provider>
  );
}

export function useAdminAbility(): AdminAbilityContextValue {
  return useContext(AdminAbilityContext);
}
