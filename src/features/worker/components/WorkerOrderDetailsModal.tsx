"use client";

import { AdminModalShell } from "@/components/Admin/AdminModalShell";
import { CategoryColorCardBadge } from "@/components/CategoryColorBadge";
import { OrderDetailField } from "@/components/work-orders/OrderDetailField";
import { WorkOrderPriorityRibbon } from "@/components/work-orders";
import { formatDict, getDictionary } from "@/i18n";
import { parseCustomerAddress } from "@/lib/customerAddress";
import type { WorkerOrderDetailsData } from "@/features/worker/lib/workerOrderDetails";
import { phoneTelHref } from "@/features/worker/lib/workerOrderDetails";

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
  const customerDict = getDictionary().admin.customers;
  if (!data) return null;

  const vis = data.fieldVisibility;
  const phone = data.customerPhone?.trim() ?? "";
  const customerName = data.customerName?.trim() ?? "";
  const addressParts = parseCustomerAddress(data.customerAddress);

  const fieldsCard = "rounded-xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900/50 px-4 py-3";

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
      <div className="space-y-3 pb-1">
        <div className="flex items-start justify-between gap-3 px-0.5">
          <div className="font-mono text-xl font-black text-zinc-900 dark:text-zinc-50">
            #{data.orderId}
          </div>
          {data.priority ? (
            <WorkOrderPriorityRibbon priority={data.priority} labels={dict} />
          ) : null}
        </div>

        {vis.showMode && data.categoryName.trim() ? (
          <div className="px-0.5">
            <CategoryColorCardBadge label={data.categoryName} color={data.categoryColor} />
          </div>
        ) : null}

        <div className={`${fieldsCard} grid grid-cols-1 gap-y-2.5`}>
          {data.dateLabel ? (
            <OrderDetailField label={fieldLabels.date} value={data.dateLabel} />
          ) : null}
          {data.timeLabel ? (
            <OrderDetailField label={fieldLabels.time} value={data.timeLabel} />
          ) : null}
          <OrderDetailField label={fieldLabels.resource} value={data.resourceName || "—"} />
          {vis.showMaterial ? (
            <OrderDetailField
              label={fieldLabels.material}
              value={data.materialName?.trim() ? data.materialName : "—"}
            />
          ) : null}
          {vis.showQuantity ? (
            <OrderDetailField
              label={fieldLabels.quantity}
              value={data.quantity?.trim() ? data.quantity : "—"}
            />
          ) : null}
          {vis.showCustomer ? (
            <>
              <OrderDetailField
                label={fieldLabels.customer}
                value={customerName || "—"}
              />
              {phone ? (
                <OrderDetailField
                  label={customerDict.phoneLabel}
                  value={phone}
                  valueNode={
                    <a
                      href={phoneTelHref(phone)}
                      className="mt-0.5 inline-block text-[15px] font-semibold text-emerald-700 dark:text-emerald-400 break-all hover:underline"
                    >
                      {phone}
                    </a>
                  }
                />
              ) : null}
              {addressParts.street.trim() ? (
                <OrderDetailField
                  label={customerDict.streetLabel}
                  value={addressParts.street}
                />
              ) : null}
              {addressParts.city.trim() ? (
                <OrderDetailField label={customerDict.cityLabel} value={addressParts.city} />
              ) : null}
              {addressParts.postalCode.trim() ? (
                <OrderDetailField
                  label={customerDict.postalCodeLabel}
                  value={addressParts.postalCode}
                />
              ) : null}
            </>
          ) : null}
          {vis.showDescription && data.description?.trim() ? (
            <OrderDetailField
              label={vis.descriptionLabel}
              value={data.description}
              multiline
            />
          ) : null}
        </div>

        {data.orderedBy?.trim() ? (
          <p className="px-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
            {fieldLabels.orderedBy}{" "}
            <span className="font-medium text-zinc-600 dark:text-zinc-300">{data.orderedBy}</span>
          </p>
        ) : null}
      </div>
    </AdminModalShell>
  );
}
