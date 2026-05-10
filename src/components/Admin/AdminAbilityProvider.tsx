"use client";

import { createContext, useContext } from "react";

const AdminAbilityContext = createContext<{ canMutate: boolean }>({ canMutate: false });

export function AdminAbilityProvider({
  canMutate,
  children,
}: {
  canMutate: boolean;
  children: React.ReactNode;
}) {
  return (
    <AdminAbilityContext.Provider value={{ canMutate }}>
      {children}
    </AdminAbilityContext.Provider>
  );
}

export function useAdminAbility(): { canMutate: boolean } {
  return useContext(AdminAbilityContext);
}
