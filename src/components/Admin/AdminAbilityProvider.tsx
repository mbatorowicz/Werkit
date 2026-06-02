"use client";

import { createContext, useContext } from "react";

type AdminAbilityContextValue = {
  canMutate: boolean;
  /** Moduł GPS i mapa (wszystkie flagi GPS włączone). */
  gpsEnabled: boolean;
  durEnabled: boolean;
};

const AdminAbilityContext = createContext<AdminAbilityContextValue>({
  canMutate: false,
  gpsEnabled: true,
  durEnabled: false,
});

export function AdminAbilityProvider({
  canMutate,
  gpsEnabled,
  durEnabled,
  children,
}: {
  canMutate: boolean;
  gpsEnabled: boolean;
  durEnabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <AdminAbilityContext.Provider value={{ canMutate, gpsEnabled, durEnabled }}>
      {children}
    </AdminAbilityContext.Provider>
  );
}

export function useAdminAbility(): AdminAbilityContextValue {
  return useContext(AdminAbilityContext);
}
