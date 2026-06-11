"use client";

import { CheckCircle2 } from "lucide-react";
import { OrderLabelCard } from "@/components/work-orders/OrderLabelCard";
import { formatUiDateOnly, formatUiTimeHm, useAppLocale, useDictionary } from "@/i18n";
import type { AppDictionary } from "@/i18n/types";
import {
  categoryFlagsFromWorkOrderRow,
  orderLabelDescriptionText,
  resolveOrderLabelFieldVisibility,
} from "@/lib/orderLabelFieldVisibility";
import { useWorkerOrderDetailsModal } from "@/features/worker/hooks/useWorkerOrderDetailsModal";
import { workerOrderDetailsFromSession } from "@/features/worker/lib/workerOrderDetails";
import type { OrderType } from "@/types/worker";

type HistoryDict = AppDictionary["worker"]["history"];
type WorkerClient = AppDictionary["worker"]["client"];

export type WorkerHistoryListSession = {
  id: number;
  workOrderId?: number | null;
  categoryName: string | null;
  categoryColor?: string | null;
  categoryShowMaterial?: boolean | null;
  categoryShowCustomer?: boolean | null;
  categoryShowQuantity?: boolean | null;
  categoryShowTaskDescription?: boolean | null;
  startTime: string;
  endTime?: string | null;
  taskDescription?: string | null;
  repairDescription?: string | null;
  orderType?: OrderType | null;
  resourceName?: string | null;
  materialName?: string | null;
  quantityTons?: number | null;
  customerFirstName?: string | null;
  customerLastName?: string | null;
  customerPhone?: string | null;
  customerAddress?: string | null;
  hasPhotos?: boolean;
  hasNotes?: boolean;
};

function asIsoString(v: unknown): string {
  if (!v) return "";
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

export function WorkerHistoryList({
  sessions,
  historyLabels,
  workerClient,
}: {
  sessions: WorkerHistoryListSession[];
  historyLabels: HistoryDict;
  workerClient: WorkerClient;
}) {
  const { openOrderDetails, orderDetailsModal } = useWorkerOrderDetailsModal();
  const dictionary = useDictionary();
  const locale = useAppLocale();
  const tonsSuffix = dictionary.workOrdersSchedule.tons;

  return (
    <>
      <div className="space-y-4">
        {sessions.map((raw) => {
          const s: WorkerHistoryListSession = {
            ...raw,
            startTime: asIsoString(raw.startTime),
            endTime: raw.endTime ? asIsoString(raw.endTime) : null,
          };
          const st = s.startTime ? new Date(s.startTime) : null;
          const en = s.endTime ? new Date(s.endTime) : null;
          const endLabel = en && !Number.isNaN(en.getTime()) ? formatUiDateOnly(en) : "";

          return (
            <div
              key={s.id}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 shadow-sm"
            >
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" aria-hidden />
                <span className="text-xs font-bold text-emerald-500 uppercase tracking-widest">
                  {historyLabels.sessionCompletedBadge}
                </span>
                {endLabel ? (
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 ml-auto">
                    {endLabel}
                  </span>
                ) : null}
              </div>

              <OrderLabelCard
                tone="done"
                layout="teaser"
                orderNo={s.workOrderId ? `#${s.workOrderId}` : `#${s.id}`}
                mode={s.categoryName || workerClient.noCategoryName}
                modeColor={s.categoryColor ?? null}
                machine={s.resourceName || "—"}
                material={s.materialName}
                quantity={s.quantityTons ? `${s.quantityTons}${tonsSuffix}` : null}
                customerFirstName={s.customerFirstName}
                customerLastName={s.customerLastName}
                customerPhone={s.customerPhone}
                customerAddress={s.customerAddress}
                description={orderLabelDescriptionText({
                  orderType: s.orderType,
                  taskDescription: s.taskDescription,
                  repairDescription: s.repairDescription,
                })}
                fieldVisibility={resolveOrderLabelFieldVisibility(
                  {
                    orderType: s.orderType,
                    ...categoryFlagsFromWorkOrderRow({
                      categoryShowMaterial: s.categoryShowMaterial ?? undefined,
                      categoryShowCustomer: s.categoryShowCustomer ?? undefined,
                      categoryShowQuantity: s.categoryShowQuantity ?? undefined,
                      categoryShowTaskDescription: s.categoryShowTaskDescription ?? undefined,
                    }),
                  },
                  locale
                )}
                dateLabel={st && !Number.isNaN(st.getTime()) ? formatUiDateOnly(st) : "—"}
                timeLabel={`${
                  st && !Number.isNaN(st.getTime()) ? formatUiTimeHm(st) : "—"
                } – ${en && !Number.isNaN(en.getTime()) ? formatUiTimeHm(en) : "—"}`}
                attachmentPhotos={Boolean(s.hasPhotos)}
                attachmentNotes={Boolean(s.hasNotes)}
                onCardClick={() =>
                  openOrderDetails({
                    ...workerOrderDetailsFromSession(s, tonsSuffix, workerClient, locale),
                    historyDetailHref: `/worker/history/${s.id}`,
                    historyDetailLinkLabel: historyLabels.openSessionDetail,
                  })
                }
                cardAriaLabel={workerClient.orderDetailsOpenCategory}
              />
            </div>
          );
        })}
      </div>
      {orderDetailsModal}
    </>
  );
}
