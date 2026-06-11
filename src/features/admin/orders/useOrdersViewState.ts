"use client";

import { useState } from "react";
import type { DispatchViewMode } from "@/components/Admin/Orders/OrdersDispatchToolbar";

export function useOrdersViewState() {
  const [searchQuery, setSearchQuery] = useState("");
  const [tableLimit, setTableLimit] = useState(20);
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<DispatchViewMode>(() => {
    try {
      const raw = localStorage.getItem("werkit_admin_dispatch_view");
      return raw === "board" || raw === "table" ? raw : "board";
    } catch {
      return "board";
    }
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsData, setSettingsData] = useState<unknown>(null);

  const setViewModePersisted = (m: DispatchViewMode) => {
    setViewMode(m);
    setPage(1);
    try {
      localStorage.setItem("werkit_admin_dispatch_view", m);
    } catch {
      /* ignore */
    }
  };
  const setSearchQueryAndResetPage = (q: string) => {
    setSearchQuery(q);
    setPage(1);
  };
  const setTableLimitAndResetPage = (n: number) => {
    setTableLimit(n);
    setPage(1);
  };

  return {
    searchQuery,
    tableLimit,
    page,
    setPage,
    viewMode,
    isSettingsOpen,
    setIsSettingsOpen,
    settingsData,
    setSettingsData,
    setViewModePersisted,
    setSearchQueryAndResetPage,
    setTableLimitAndResetPage,
  };
}
