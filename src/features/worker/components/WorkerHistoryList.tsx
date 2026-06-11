"use client";

import { useAppLocale, useDictionary } from "@/i18n";
import type { AppDictionary } from "@/i18n/types";
import { useWorkerOrderDetailsModal } from "@/features/worker/hooks/useWorkerOrderDetailsModal";
import { workerOrderDetailsFromSession } from "@/features/worker/lib/workerOrderDetails";
import { WorkerHistorySessionCard } from "@/features/worker/components/WorkerHistorySessionCard";
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

          return (
            <WorkerHistorySessionCard
              key={s.id}
              s={s}
              historyLabels={historyLabels}
              workerClient={workerClient}
              tonsSuffix={tonsSuffix}
              locale={locale}
              onOpenDetails={() =>
                openOrderDetails({
                  ...workerOrderDetailsFromSession(s, tonsSuffix, workerClient, locale),
                  historyDetailHref: `/worker/history/${s.id}`,
                  historyDetailLinkLabel: historyLabels.openSessionDetail,
                })
              }
            />
          );
        })}
      </div>
      {orderDetailsModal}
    </>
  );
}
