"use client";

import { createContext, useContext } from "react";

type AdminAbilityContextValue = {
  canMutate: boolean;
  durEnabled: boolean;
};

const AdminAbilityContext = createContext<AdminAbilityContextValue>({
  canMutate: false,
  durEnabled: false,
});

export function AdminAbilityProvider({
  canMutate,
  durEnabled,
  children,
}: {
  canMutate: boolean;
  durEnabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <AdminAbilityContext.Provider value={{ canMutate, durEnabled }}>
      {children}
    </AdminAbilityContext.Provider>
  );
}

export function useAdminAbility(): AdminAbilityContextValue {
  return useContext(AdminAbilityContext);
}
