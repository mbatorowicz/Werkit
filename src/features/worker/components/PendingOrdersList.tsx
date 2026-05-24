"use client";

import { Play, Clock } from "lucide-react";
import Link from "next/link";
import { WorkOrderPendingCard } from "@/components/work-orders/WorkOrderPendingCard";
import { formatDict, formatUiTimeHm } from "@/i18n";
import type { AppDictionary } from "@/i18n/types";
import { WorkOrder, UserData } from "@/types/worker";

interface PendingOrdersListProps {
  workOrders: WorkOrder[];
  overdueOrder?: WorkOrder | null;
  upcomingOrder?: WorkOrder | null;
  currentUser: UserData | null;
  dict: AppDictionary["worker"]["client"];
  requestAcceptOrder: (orderId: number) => void;
  fetchSessionAndPath: (showLoader: boolean, fetchGpsPath: boolean) => void;
  acceptErrors?: Record<number, string>;
}

export default function PendingOrdersList({
  workOrders,
  overdueOrder,
  upcomingOrder,
  currentUser,
  dict,
  requestAcceptOrder,
  fetchSessionAndPath,
  acceptErrors = {},
}: PendingOrdersListProps) {
  return (
    <div className="w-full flex flex-col items-center justify-center mt-10 space-y-6">
      <div className="flex flex-col items-center">
        <button
          onClick={() => fetchSessionAndPath(true, true)}
          className="w-24 h-24 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors active:scale-95 border border-zinc-200 dark:border-zinc-700 rounded-full flex items-center justify-center mb-6 shadow-inner cursor-pointer"
          title={dict.refresh}
        >
          <Clock className="w-10 h-10 text-zinc-700 dark:text-zinc-300" />
        </button>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">{dict.readyToStart}</h2>
        <p className="text-zinc-500 text-center mb-6 text-sm max-w-[250px]">{dict.selectOrder}</p>
      </div>

      {workOrders.length > 0 && (
        <div className="w-full max-w-sm flex flex-col gap-3 mb-6">
          <h3 className="text-xs font-bold uppercase tracking-widest text-amber-500 mb-2">{dict.pendingOrders}</h3>

          {overdueOrder && (
            <div className="w-full bg-red-50 dark:bg-red-500/10 border-2 border-red-500 dark:border-red-600 rounded-xl p-3 mb-2 flex items-start gap-3 shadow-sm animate-pulse">
              <div className="bg-red-100 dark:bg-red-500/20 p-2 rounded-full shrink-0 mt-0.5">
                <Clock className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-red-800 dark:text-red-300">{dict.orderOverdueTitle}</span>
                <span className="text-xs text-red-700 dark:text-red-400/90 mt-0.5">
                  {formatDict(dict.orderOverdueBody, { id: overdueOrder.id })}
                </span>
              </div>
            </div>
          )}

          {upcomingOrder && !overdueOrder && (
            <div className="w-full bg-rose-50 dark:bg-rose-500/10 border-2 border-rose-400 dark:border-rose-500 rounded-xl p-3 mb-2 flex items-start gap-3 animate-pulse">
              <div className="bg-rose-100 dark:bg-rose-500/20 p-2 rounded-full shrink-0 mt-0.5">
                <Clock className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-rose-800 dark:text-rose-300">{dict.upcomingTerm}</span>
                <span className="text-xs text-rose-700 dark:text-rose-400/90 mt-0.5">
                  {formatDict(dict.orderFastReq, {
                    id: upcomingOrder.id,
                    time: formatUiTimeHm(upcomingOrder.dueDate!),
                  })}
                </span>
              </div>
            </div>
          )}

          {workOrders.map((order) => (
            <WorkOrderPendingCard
              key={order.id}
              order={order}
              dict={dict}
              mode="start"
              onStart={requestAcceptOrder}
              acceptError={acceptErrors[order.id]}
            />
          ))}
        </div>
      )}

      {(!currentUser || currentUser.canCreateOwnOrders !== false) && (
        <div className="w-full max-w-sm flex flex-col items-center mt-4">
          <div className="text-zinc-400 text-xs uppercase font-bold tracking-widest mb-4">{dict.or}</div>
          <Link
            href="/worker/wizard"
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-5 px-6 flex items-center justify-center gap-3 transition-all active:scale-95 shadow-[0_0_40px_-10px_rgba(16,185,129,0.5)]"
          >
            <Play className="w-6 h-6 fill-current" />
            <span className="text-lg font-bold uppercase tracking-wider">{dict.defineCustom}</span>
          </Link>
        </div>
      )}
    </div>
  );
}
