"use client";

import { AdminModalShell } from "@/components/Admin/AdminModalShell";
import { CategoryColorCardBadge } from "@/components/CategoryColorBadge";
import { WorkOrderPriorityRibbon } from "@/components/work-orders";
import { formatDict, getDictionary } from "@/i18n";
import type { WorkerOrderDetailsData } from "@/features/worker/lib/workerOrderDetails";
import { phoneTelHref } from "@/features/worker/lib/workerOrderDetails";

function DetailRow({
  label,
  value,
  multiline,
  valueNode,
}: {
  label: string;
  value: string;
  multiline?: boolean;
  valueNode?: React.ReactNode;
}) {
  return (
    <div className="min-w-0 py-2 border-b border-zinc-100 dark:border-zinc-700/80 last:border-0">
      <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </div>
      {valueNode ?? (
        <div
          className={
            multiline
              ? "mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50 break-words whitespace-pre-wrap leading-snug"
              : "mt-0.5 text-lg font-semibold text-zinc-900 dark:text-zinc-50 break-words"
          }
        >
          {value}
        </div>
      )}
    </div>
  );
}

export function WorkerOrderDetailsModal({
  open,
  onClose,
  data,
}: {
  open: boolean;
  onClose: () => void;
  data: WorkerOrderDetailsData | null;
}) {
  const dict = getDictionary().worker.client;
  const fieldLabels = getDictionary().admin.orderFields;
  if (!data) return null;

  const vis = data.fieldVisibility;
  const phone = data.customerPhone?.trim() ?? "";
  const customerName = data.customerName?.trim() ?? "";
  const customerAddress = data.customerAddress?.trim() ?? "";
  const phoneLabel = getDictionary().admin.workers.phoneLabel;

  return (
    <AdminModalShell
      open={open}
      onClose={onClose}
      title={formatDict(dict.orderDetailsTitle, { id: data.orderId })}
      maxWidthClass="max-w-lg"
      titleSize="lg"
      zIndexClass="z-[9999]"
      scrollableBody
      closeOnBackdropClick
    >
      <div className="space-y-4 px-1 pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="font-mono text-2xl font-black text-zinc-900 dark:text-zinc-50">
            #{data.orderId}
          </div>
          {data.priority ? (
            <WorkOrderPriorityRibbon priority={data.priority} labels={dict} />
          ) : null}
        </div>

        {vis.showMode && data.categoryName.trim() ? (
          <CategoryColorCardBadge label={data.categoryName} color={data.categoryColor} />
        ) : null}

        <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 dark:border-zinc-600 dark:bg-zinc-900/40 px-3">
          <DetailRow label={fieldLabels.resource} value={data.resourceName || "—"} />
          {vis.showMaterial ? (
            <DetailRow
              label={fieldLabels.material}
              value={data.materialName?.trim() ? data.materialName : "—"}
            />
          ) : null}
          {vis.showQuantity ? (
            <DetailRow
              label={fieldLabels.quantity}
              value={data.quantity?.trim() ? data.quantity : "—"}
            />
          ) : null}
          {vis.showCustomer ? (
            <DetailRow
              label={fieldLabels.customer}
              value={customerName || "—"}
              valueNode={
                <div className="mt-0.5 space-y-1.5">
                  <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 break-words">
                    {customerName || "—"}
                  </div>
                  {phone ? (
                    <div>
                      <div className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                        {phoneLabel}
                      </div>
                      <a
                        href={phoneTelHref(phone)}
                        className="text-lg font-semibold text-emerald-700 dark:text-emerald-400 break-all hover:underline"
                      >
                        {phone}
                      </a>
                    </div>
                  ) : null}
                  {customerAddress ? (
                    <div>
                      <div className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                        {dict.orderDetailsAddress}
                      </div>
                      <div className="text-base font-medium text-zinc-800 dark:text-zinc-200 break-words whitespace-pre-wrap leading-snug">
                        {customerAddress}
                      </div>
                    </div>
                  ) : null}
                </div>
              }
            />
          ) : null}
          {vis.showDescription && data.description?.trim() ? (
            <DetailRow
              label={vis.descriptionLabel}
              value={data.description}
              multiline
            />
          ) : null}
          {data.dateLabel ? (
            <DetailRow label={fieldLabels.date} value={data.dateLabel} />
          ) : null}
          {data.timeLabel ? (
            <DetailRow label={fieldLabels.time} value={data.timeLabel} />
          ) : null}
        </div>

        {data.orderedBy?.trim() ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {fieldLabels.orderedBy}{" "}
            <span className="font-semibold text-zinc-700 dark:text-zinc-200">
              {data.orderedBy}
            </span>
          </p>
        ) : null}
      </div>
    </AdminModalShell>
  );
}
