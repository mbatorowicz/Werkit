"use client";

import { CheckCircle2 } from "lucide-react";
import { OrderLabelCard } from "@/components/work-orders/OrderLabelCard";
import { formatUiDateOnly, formatUiTimeHm, type Locale } from "@/i18n";
import type { AppDictionary } from "@/i18n/types";
import {
  categoryFlagsFromWorkOrderRow,
  orderLabelDescriptionText,
  resolveOrderLabelFieldVisibility,
  type OrderLabelFieldVisibility,
} from "@/lib/orderLabelFieldVisibility";
import type { WorkerHistoryListSession } from "@/features/worker/components/WorkerHistoryList";

type HistoryDict = AppDictionary["worker"]["history"];
type WorkerClient = AppDictionary["worker"]["client"];

function historySessionTimeLabels(s: WorkerHistoryListSession): {
  endLabel: string;
  dateLabel: string;
  timeLabel: string;
} {
  const st = s.startTime ? new Date(s.startTime) : null;
  const en = s.endTime ? new Date(s.endTime) : null;
  const stValid = st !== null && !Number.isNaN(st.getTime());
  const enValid = en !== null && !Number.isNaN(en.getTime());
  return {
    endLabel: enValid ? formatUiDateOnly(en) : "",
    dateLabel: stValid ? formatUiDateOnly(st) : "—",
    timeLabel: `${stValid ? formatUiTimeHm(st) : "—"} – ${enValid ? formatUiTimeHm(en) : "—"}`,
  };
}

function historySessionFieldVisibility(
  s: WorkerHistoryListSession,
  locale: Locale
): OrderLabelFieldVisibility {
  return resolveOrderLabelFieldVisibility(
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
  );
}

export function WorkerHistorySessionCard({
  s,
  historyLabels,
  workerClient,
  tonsSuffix,
  locale,
  onOpenDetails,
}: {
  s: WorkerHistoryListSession;
  historyLabels: HistoryDict;
  workerClient: WorkerClient;
  tonsSuffix: string;
  locale: Locale;
  onOpenDetails: () => void;
}) {
  const { endLabel, dateLabel, timeLabel } = historySessionTimeLabels(s);

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" aria-hidden />
        <span className="text-xs font-bold text-emerald-500 uppercase tracking-widest">
          {historyLabels.sessionCompletedBadge}
        </span>
        {endLabel ? (
          <span className="text-xs text-zinc-500 dark:text-zinc-400 ml-auto">{endLabel}</span>
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
        fieldVisibility={historySessionFieldVisibility(s, locale)}
        dateLabel={dateLabel}
        timeLabel={timeLabel}
        attachmentPhotos={Boolean(s.hasPhotos)}
        attachmentNotes={Boolean(s.hasNotes)}
        onCardClick={onOpenDetails}
        cardAriaLabel={workerClient.orderDetailsOpenCategory}
      />
    </div>
  );
}
