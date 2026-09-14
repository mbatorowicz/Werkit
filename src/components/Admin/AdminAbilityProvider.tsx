"use client";

import { createContext, useContext } from "react";
import { DEFAULT_ADMIN_GPS_FLAGS, type AdminGpsCapabilityFlags } from "@/types/featureFlags";

export type DelegationScope = "all" | "scoped" | "none";

type AdminAbilityContextValue = {
  canMutate: boolean;
  /** Tworzenie/edycja zleceń (pełny admin lub lider/kierownik). */
  canDelegateOrders: boolean;
  delegationScope: DelegationScope;
  /** Śledzenie GPS albo mapa — geofence off nie gasi tej flagi. */
  gpsEnabled: boolean;
  gpsFlags: AdminGpsCapabilityFlags;
  durEnabled: boolean;
};

const AdminAbilityContext = createContext<AdminAbilityContextValue>({
  canMutate: false,
  canDelegateOrders: false,
  delegationScope: "none",
  gpsEnabled: true,
  gpsFlags: DEFAULT_ADMIN_GPS_FLAGS,
  durEnabled: false,
});

export function AdminAbilityProvider({
  canMutate,
  canDelegateOrders,
  delegationScope,
  gpsEnabled,
  gpsFlags = DEFAULT_ADMIN_GPS_FLAGS,
  durEnabled,
  children,
}: {
  canMutate: boolean;
  canDelegateOrders: boolean;
  delegationScope: DelegationScope;
  gpsEnabled: boolean;
  gpsFlags?: AdminGpsCapabilityFlags;
  durEnabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <AdminAbilityContext.Provider
      value={{
        canMutate,
        canDelegateOrders,
        delegationScope,
        gpsEnabled,
        gpsFlags,
        durEnabled,
      }}
    >
      {children}
    </AdminAbilityContext.Provider>
  );
}

export function useAdminAbility(): AdminAbilityContextValue {
  return useContext(AdminAbilityContext);
}
