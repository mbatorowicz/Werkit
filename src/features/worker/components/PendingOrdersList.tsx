"use client";

import { Play, Clock } from "lucide-react";
import Link from "next/link";
import type { AppDictionary } from "@/i18n/types";
import { DEFAULT_UI_LOCALE, formatDict } from "@/i18n";
import {
  workOrderCategoryHeadingClass,
  workOrderPendingListCardClass,
} from "@/features/worker/lib/workOrderPresentation";
import { WorkOrderPriorityRibbon } from "@/components/work-orders";
import { OrderLabelCard } from "@/components/work-orders/OrderLabelCard";
import { WorkOrder, UserData } from "@/types/worker";

interface PendingOrdersListProps {
  workOrders: WorkOrder[];
  overdueOrder?: WorkOrder | null;
  upcomingOrder?: WorkOrder | null;
  currentUser: UserData | null;
  dict: AppDictionary["worker"]["client"];
  requestAcceptOrder: (orderId: number) => void;
  fetchSessionAndPath: (showLoader: boolean, fetchGpsPath: boolean) => void;
}

export default function PendingOrdersList({
  workOrders,
  overdueOrder,
  upcomingOrder,
  currentUser,
  dict,
  requestAcceptOrder,
  fetchSessionAndPath
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
        <p className="text-zinc-500 text-center mb-6 text-sm max-w-[250px]">
          {dict.selectOrder}
        </p>
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
                    time: new Date(upcomingOrder.dueDate!).toLocaleTimeString(DEFAULT_UI_LOCALE, {
                      hour: "2-digit",
                      minute: "2-digit",
                    }),
                  })}
                </span>
              </div>
            </div>
          )}

          {workOrders.map(order => (
            <div key={order.id} className={workOrderPendingListCardClass(order.priority)}>
              <div className="flex flex-col gap-1">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-bold text-amber-900 dark:text-amber-500 flex flex-wrap items-center gap-2 min-w-0">
                    <span className="bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-400 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-500/30 shrink-0">
                      #{order.id}
                    </span>
                    <div className={`font-bold text-lg min-w-0 break-words ${workOrderCategoryHeadingClass(order.priority)}`}>
                      {order.categoryName || dict.noCategoryName}
                    </div>
                  </span>
                  <WorkOrderPriorityRibbon priority={order.priority} labels={dict} />
                </div>
                <div className="mt-2">
                  <OrderLabelCard
                    tone="planned"
                    orderNo={`#${order.id}`}
                    mode={order.categoryName || dict.noCategoryName}
                    machine={order.resourceName || "—"}
                    material={order.materialName}
                    quantity={order.quantityTons ? `${order.quantityTons}t` : null}
                    customer={order.customerName}
                    description={order.taskDescription}
                    orderedBy={order.creatorName ?? null}
                    orderedByLabel={dict.orderedBy}
                    dateLabel={
                      order.dueDate
                        ? new Date(order.dueDate).toLocaleDateString(DEFAULT_UI_LOCALE)
                        : new Date(order.createdAt).toLocaleDateString(DEFAULT_UI_LOCALE)
                    }
                    timeLabel={
                      order.dueDate
                        ? new Date(order.dueDate).toLocaleTimeString(DEFAULT_UI_LOCALE, { hour: "2-digit", minute: "2-digit" })
                        : new Date(order.createdAt).toLocaleTimeString(DEFAULT_UI_LOCALE, { hour: "2-digit", minute: "2-digit" })
                    }
                    className="bg-white/60 dark:bg-zinc-950/30"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => requestAcceptOrder(order.id)}
                className="bg-amber-600 hover:bg-amber-500 text-white rounded-lg py-3 px-4 flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm w-full"
              >
                <Play className="w-4 h-4 fill-current" />
                <span className="text-sm font-bold uppercase tracking-wider">{dict.startTask}</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {(!currentUser || currentUser.canCreateOwnOrders !== false) && (
        <div className="w-full max-w-sm flex flex-col items-center mt-4">
          <div className="text-zinc-400 text-xs uppercase font-bold tracking-widest mb-4">{dict.or}</div>
          <Link href="/worker/wizard" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-5 px-6 flex items-center justify-center gap-3 transition-all active:scale-95 shadow-[0_0_40px_-10px_rgba(16,185,129,0.5)]">
            <Play className="w-6 h-6 fill-current" />
            <span className="text-lg font-bold uppercase tracking-wider">{dict.defineCustom}</span>
          </Link>
        </div>
      )}
    </div>
  );
}
