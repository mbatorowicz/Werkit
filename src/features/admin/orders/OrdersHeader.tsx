"use client";

import { Map, Plus, RefreshCw, Settings } from "lucide-react";
import { fetchWithDeviceTelemetry } from "@/lib/fetchWithDeviceTelemetry";
import { adminApi } from "@/lib/appRoutes";
import { BTN_PRIMARY_COMPACT } from "@/lib/uiButtons";
import { cn } from "@/lib/cn";
import { parseJsonUnknown } from "@/lib/parseApiJson";
import { isRecord } from "@/lib/narrowApiListRows";
import { ICON_HIT } from "@/lib/uiTokens";

interface OrdersHeaderProps {
  navTitle: string;
  dict: {
    tooltipSettings: string;
    tooltipRefresh: string;
    newOrder: string;
  };
  canMutate: boolean;
  showSettings?: boolean;
  onOpenSettings: (data: unknown) => void;
  onRefresh: () => void;
  onNewOrder: () => void;
}

export function OrdersHeader({
  navTitle,
  dict,
  canMutate,
  showSettings = true,
  onOpenSettings,
  onRefresh,
  onNewOrder,
}: OrdersHeaderProps) {
  return (
    <div className="mb-6 flex flex-col items-stretch justify-between gap-4 sm:items-start md:flex-row md:items-center">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">
          <Map className="h-6 w-6 text-emerald-500" /> {navTitle}
        </h1>
      </div>
      <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
        {showSettings ? (
          <button
            type="button"
            onClick={async () => {
              try {
                const res = await fetchWithDeviceTelemetry(
                  "Admin dispatch: settings GET",
                  adminApi.settings,
                  undefined,
                  {
                    category: "admin",
                  }
                );
                if (res.ok) {
                  const raw = await parseJsonUnknown(res);
                  if (isRecord(raw)) onOpenSettings(raw);
                }
              } catch {
                /* ignore */
              }
            }}
            className={cn(
              ICON_HIT,
              "rounded-lg border border-zinc-200 bg-white text-zinc-500 shadow-sm transition hover:bg-zinc-50 hover:text-zinc-900 active:scale-95 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white"
            )}
            title={dict.tooltipSettings}
            aria-label={dict.tooltipSettings}
          >
            <Settings className="h-4 w-4" />
          </button>
        ) : null}
        <button
          type="button"
          onClick={onRefresh}
          className={cn(
            ICON_HIT,
            "rounded-lg border border-zinc-200 bg-white text-zinc-500 shadow-sm transition hover:bg-zinc-50 hover:text-zinc-900 active:scale-95 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white"
          )}
          title={dict.tooltipRefresh}
          aria-label={dict.tooltipRefresh}
        >
          <RefreshCw className="h-4 w-4" />
        </button>
        {canMutate ? (
          <button
            type="button"
            onClick={onNewOrder}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 sm:flex-none",
              BTN_PRIMARY_COMPACT
            )}
          >
            <Plus className="h-4 w-4" /> {dict.newOrder}
          </button>
        ) : null}
      </div>
    </div>
  );
}
