"use client";

import { Map, Plus, RefreshCw, Settings } from "lucide-react";
import { fetchWithDeviceTelemetry } from "@/lib/fetchWithDeviceTelemetry";
import { adminApi } from "@/lib/appRoutes";
import { parseJsonUnknown } from "@/lib/parseApiJson";
import { isRecord } from "@/lib/narrowApiListRows";

interface OrdersHeaderProps {
  navTitle: string;
  dict: {
    tooltipSettings: string;
    tooltipRefresh: string;
    newOrder: string;
  };
  canMutate: boolean;
  onOpenSettings: (data: unknown) => void;
  onRefresh: () => void;
  onNewOrder: () => void;
}

export function OrdersHeader({
  navTitle,
  dict,
  canMutate,
  onOpenSettings,
  onRefresh,
  onNewOrder,
}: OrdersHeaderProps) {
  return (
    <div className="mb-6 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">
          <Map className="h-6 w-6 text-emerald-500" /> {navTitle}
        </h1>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={async () => {
            try {
              const res = await fetchWithDeviceTelemetry("Admin dispatch: settings GET", adminApi.settings, undefined, {
                category: "admin",
              });
              if (res.ok) {
                const raw = await parseJsonUnknown(res);
                if (isRecord(raw)) onOpenSettings(raw);
              }
            } catch {
              /* ignore */
            }
          }}
          className="rounded-lg border border-zinc-200 bg-white p-2.5 text-zinc-500 shadow-sm transition hover:bg-zinc-50 hover:text-zinc-900 active:scale-95 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white"
          title={dict.tooltipSettings}
        >
          <Settings className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onRefresh}
          className="rounded-lg border border-zinc-200 bg-white p-2.5 text-zinc-500 shadow-sm transition hover:bg-zinc-50 hover:text-zinc-900 active:scale-95 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white"
          title={dict.tooltipRefresh}
        >
          <RefreshCw className="h-4 w-4" />
        </button>
        {canMutate ? (
          <button
            type="button"
            onClick={onNewOrder}
            className="flex items-center gap-2 rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            <Plus className="h-4 w-4" /> {dict.newOrder}
          </button>
        ) : null}
      </div>
    </div>
  );
}
