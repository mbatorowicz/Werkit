"use client";

import Link from "next/link";
import { AdminModalShell } from "@/components/Admin/AdminModalShell";
import { CategoryColorCardBadge } from "@/components/CategoryColorBadge";
import { CustomerContactFields } from "@/components/customers/CustomerContactFields";
import { OrderDetailField } from "@/components/work-orders/OrderDetailField";
import { WorkOrderPriorityRibbon } from "@/components/work-orders";
import { formatDict, useDictionary } from "@/i18n";
import { buildOrderLabelCustomerDisplay } from "@/lib/orderLabelCustomerDisplay";
import type { WorkerOrderDetailsData } from "@/features/worker/lib/workerOrderDetails";
import { UI_RADIUS_INNER } from "@/lib/uiRadius";

export function WorkerOrderDetailsModal({
  open,
  onClose,
  data,
}: {
  open: boolean;
  onClose: () => void;
  data: WorkerOrderDetailsData | null;
}) {
  const dictionary = useDictionary();
  const dict = dictionary.worker.client;
  const fieldLabels = dictionary.admin.orderFields;
  const customerDict = dictionary.admin.customers;
  if (!data) return null;

  const vis = data.fieldVisibility;
  const customerDisplay = buildOrderLabelCustomerDisplay({
    customerName: data.customerName,
    customerPhone: data.customerPhone,
    customerAddress: data.customerAddress,
  });

  const fieldsCard = `${UI_RADIUS_INNER} border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900/50 px-4 py-3`;

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
            <CustomerContactFields
              variant="order"
              labels={{
                customer: fieldLabels.customer,
                streetLabel: customerDict.streetLabel,
                postalCodeLabel: customerDict.postalCodeLabel,
                cityLabel: customerDict.cityLabel,
                phoneLabel: customerDict.phoneLabel,
              }}
              customerName={customerDisplay.customerName}
              phone={customerDisplay.customerPhone}
              addressParts={customerDisplay.addressParts}
              showPhoneWhenEmpty={false}
              phoneAsLink
            />
          ) : null}
          {vis.showDescription && data.description?.trim() ? (
            <OrderDetailField label={vis.descriptionLabel} value={data.description} multiline />
          ) : null}
        </div>

        {data.orderedBy?.trim() ? (
          <p className="px-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
            {fieldLabels.orderedBy}{" "}
            <span className="font-medium text-zinc-600 dark:text-zinc-300">{data.orderedBy}</span>
          </p>
        ) : null}

        {data.historyDetailHref && data.historyDetailLinkLabel ? (
          <Link
            href={data.historyDetailHref}
            onClick={onClose}
            className="mt-2 block rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-center text-sm font-semibold text-emerald-800 transition-colors hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20"
          >
            {data.historyDetailLinkLabel}
          </Link>
        ) : null}
      </div>
    </AdminModalShell>
  );
}
